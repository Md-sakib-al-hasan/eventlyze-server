
import { Event, ParticipantStatus, PaymentStatus } from '@prisma/client';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


const handleJoinRequest = async (userEmail: string, eventId: string) => {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) throw new Error('User not found');

    const event = await prisma.event.findUnique({ where: { id: eventId },include: {payment: true,}, });
    if (!event) throw new Error('Event not found');

    if (event.isPaid && event.payment.status !== PaymentStatus.SUCCESS){
        switch (event.payment?.status) {
            case PaymentStatus.PENDING:
              throw new Error('Event is not paid yet');
          
            case PaymentStatus.FAILED:
              throw new Error('Event payment failed');
          
            case PaymentStatus.CANCELLED:
              throw new Error('Event payment cancelled');
        }
    }

    const existingParticipant = await prisma.participant.findFirst({
        where: {
            eventId,
            userId: user.id,
        },
    });

    if (existingParticipant) {
        return {
            message: 'You have already requested to join this event.',
            data: existingParticipant,
        };
    }

    if (event.isPublic) {
        const participant = await prisma.participant.create({
            data: {
                eventId,
                userId: user.id,
                status: ParticipantStatus.REQUESTED,
            },
        });

        return {
            message: 'Request submitted for the public event.',
            data: participant,
        };
    }

    return {
        message: 'This is a private event. Please complete payment to join.',
        data: null,
    };
};

export const participantService = {
    handleJoinRequest,
};
