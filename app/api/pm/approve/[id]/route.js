import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { requireRole, checkPermission, getNormalizedRole } from '@/lib/rbac';
import { sendStatusNotification } from '@/lib/notifications';
import { ROLES } from '@/constants/roles';
import Message from '@/models/Message';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';

/**
 * POST /api/pm/approve/:id - PM approval for invoice
 */
export async function POST(request, { params }) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.ADMIN, ROLES.PROJECT_MANAGER])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        const userRole = getNormalizedRole(session.user);

        const { id } = await params;
        const body = await request.json();
        const { action, notes } = body;

        if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_INFO' },
                { status: 400 }
            );
        }

        const invoice = await db.getInvoice(id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Check Finance approval first (Step: FM -> PM)
        if (invoice.financeApproval?.status !== 'APPROVED') {
            return NextResponse.json(
                { error: 'Finance approval required before PM approval' },
                { status: 400 }
            );
        }

        // Check PM has access to this project (skip for admin)
        if (userRole === ROLES.PROJECT_MANAGER) {
            if (!checkPermission(session.user, 'APPROVE_INVOICE', invoice)) {
                return NextResponse.json(
                    { error: 'You are not authorized to approve invoices for this project' },
                    { status: 403 }
                );
            }
        }

        // Update PM approval
        const statusMap = {
            'APPROVE': 'APPROVED',
            'REJECT': 'REJECTED',
            'REQUEST_INFO': 'INFO_REQUESTED'
        };

        const pmApproval = {
            status: statusMap[action],
            approvedBy: session.user.id,
            approvedByRole: userRole,
            approvedAt: new Date().toISOString(),
            notes: notes || null
        };

        // Update invoice status based on action
        let newStatus = invoice.status;
        if (action === 'APPROVE') {
            newStatus = 'Approved';
        } else if (action === 'REJECT') {
            newStatus = 'Rejected';
        } else if (action === 'REQUEST_INFO') {
            newStatus = 'Info Requested';
        }

        const updatedInvoice = await db.saveInvoice(id, {
            pmApproval,
            status: newStatus,
            auditUsername: session.user.name || session.user.email,
            auditAction: `PM_${action}`,
            auditDetails: `PM ${action.toLowerCase().replace('_', ' ')}${notes ? `: ${notes}` : ''}`
        });

        // Automated Messaging for Info Request
        if (action === 'REQUEST_INFO') {
            try {
                await connectToDatabase();
                const recipientRole = body.recipientRole || ROLES.VENDOR;
                let recipientId = null;
                let recipientName = null;

                if (recipientRole === ROLES.VENDOR) {
                    recipientId = updatedInvoice.submittedByUserId;
                    const vendor = await db.getUserById(recipientId);
                    recipientName = vendor?.name || 'Vendor';
                } else if (recipientRole === ROLES.FINANCE_USER) {
                    recipientId = updatedInvoice.financeApproval?.approvedBy;
                    if (recipientId) {
                        const fm = await db.getUserById(recipientId);
                        recipientName = fm?.name || 'Finance Manager';
                    }
                } else if (recipientRole === ROLES.PROJECT_MANAGER) {
                    recipientId = updatedInvoice.assignedPM;
                    if (recipientId) {
                        const pm = await db.getUserById(recipientId);
                        recipientName = pm?.name || 'Project Manager';
                    }
                }

                if (recipientId) {
                    const messageId = uuidv4();
                    await Message.create({
                        id: messageId,
                        invoiceId: updatedInvoice.id,
                        projectId: updatedInvoice.project || null,
                        senderId: session.user.id,
                        senderName: session.user.name || session.user.email,
                        senderRole: userRole,
                        recipientId: recipientId,
                        recipientName: recipientName,
                        subject: `Info Request: Invoice ${updatedInvoice.invoiceNumber || updatedInvoice.id.slice(-6)}`,
                        content: notes || `${userRole} requested more information regarding this invoice.`,
                        messageType: 'INFO_REQUEST',
                        threadId: messageId
                    });
                    console.log(`[PM Action] Automated message created for ${recipientRole} (${recipientId})`);
                } else {
                    console.warn(`[PM Action] No recipient found for role ${recipientRole}, skipping automated message.`);
                }
            } catch (msgErr) {
                console.error('[PM Action] Failed to create automated message:', msgErr);
            }
        }

        // Notify both Vendor and Finance User on rejection
        if (action === 'REJECT') {
            try {
                await connectToDatabase();
                const invoiceLabel = updatedInvoice.invoiceNumber || updatedInvoice.id.slice(-6);

                // Notify Vendor
                const vendorId = updatedInvoice.submittedByUserId;
                if (vendorId) {
                    const vendor = await db.getUserById(vendorId);
                    const msgId1 = uuidv4();
                    await Message.create({
                        id: msgId1,
                        invoiceId: updatedInvoice.id,
                        projectId: updatedInvoice.project || null,
                        senderId: session.user.id,
                        senderName: session.user.name || session.user.email,
                        senderRole: userRole,
                        recipientId: vendorId,
                        recipientName: vendor?.name || 'Vendor',
                        subject: `Invoice Rejected: ${invoiceLabel}`,
                        content: notes || 'Your invoice has been rejected by the Project Manager.',
                        messageType: 'REJECTION',
                        threadId: msgId1
                    });
                    console.log(`[PM Reject] Notification sent to vendor (${vendorId})`);
                }

                // Notify Finance User who approved it
                const financeUserId = updatedInvoice.financeApproval?.approvedBy;
                if (financeUserId) {
                    const financeUser = await db.getUserById(financeUserId);
                    const msgId2 = uuidv4();
                    await Message.create({
                        id: msgId2,
                        invoiceId: updatedInvoice.id,
                        projectId: updatedInvoice.project || null,
                        senderId: session.user.id,
                        senderName: session.user.name || session.user.email,
                        senderRole: userRole,
                        recipientId: financeUserId,
                        recipientName: financeUser?.name || 'Finance User',
                        subject: `PM Rejected Invoice: ${invoiceLabel}`,
                        content: notes || 'The Project Manager has rejected this invoice that you previously approved.',
                        messageType: 'REJECTION',
                        threadId: msgId2
                    });
                    console.log(`[PM Reject] Notification sent to finance user (${financeUserId})`);
                }
            } catch (msgErr) {
                console.error('[PM Reject] Failed to create rejection notifications:', msgErr);
            }
        }

        const notificationType = action === 'REJECT' ? 'REJECTED' : action === 'REQUEST_INFO' ? 'AWAITING_INFO' : 'PENDING_APPROVAL';
        await sendStatusNotification(updatedInvoice, notificationType).catch((err) =>
            console.error('[PM Approve] Notification failed:', err)
        );

        return NextResponse.json({
            success: true,
            message: `Invoice ${action.toLowerCase().replace('_', ' ')}`,
            newStatus
        });
    } catch (error) {
        console.error('Error processing PM approval:', error);
        return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
    }
}
