import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import nodemailer from 'nodemailer';
import { router, protectedProcedure } from '../trpc.js';
import { sent_emails, user_api_keys } from '../db/schema.js';
import { decrypt } from '../lib/encrypt.js';

const SEND_METHODS = ['smtp', 'mailto', 'clipboard'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadSmtpCredentials(db: any, userId: string) {
  const [_row] = await db
    .select({
      smtp_host: user_api_keys.smtp_host,
      smtp_port: user_api_keys.smtp_port,
      smtp_user: user_api_keys.smtp_user,
      smtp_pass: user_api_keys.smtp_pass,
      smtp_from_name: user_api_keys.smtp_from_name,
      smtp_from_email: user_api_keys.smtp_from_email,
    })
    .from(user_api_keys)
    .where(eq(user_api_keys.user_id, userId));

  if (!_row?.smtp_host) return null;

  return {
    host: _row.smtp_host,
    port: _row.smtp_port ?? 587,
    user: _row.smtp_user,
    pass: _row.smtp_pass ? decrypt(_row.smtp_pass) : '',
    from_name: _row.smtp_from_name ?? '',
    from_email: _row.smtp_from_email ?? '',
  };
}

export const emailRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: sent_emails.id,
        to_email: sent_emails.to_email,
        subject: sent_emails.subject,
        send_method: sent_emails.send_method,
        sent_at: sent_emails.sent_at,
      })
      .from(sent_emails)
      .where(eq(sent_emails.user_id, ctx.user.id))
      .orderBy(desc(sent_emails.sent_at));
  }),

  log: protectedProcedure
    .input(z.object({
      to_email: z.string().email(),
      subject: z.string(),
      body: z.string(),
      send_method: z.enum(SEND_METHODS).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .insert(sent_emails)
        .values({
          user_id: ctx.user.id,
          to_email: input.to_email,
          subject: input.subject,
          body: input.body,
          send_method: input.send_method ?? null,
        })
        .returning({
          id: sent_emails.id,
          to_email: sent_emails.to_email,
          subject: sent_emails.subject,
          send_method: sent_emails.send_method,
          sent_at: sent_emails.sent_at,
        });
      return entry;
    }),

  sendSmtp: protectedProcedure
    .input(z.object({
      to_email: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const _creds = await loadSmtpCredentials(ctx.db, ctx.user.id);
      if (!_creds) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No SMTP credentials configured' });
      }

      const _transporter = nodemailer.createTransport({
        host: _creds.host,
        port: _creds.port,
        secure: _creds.port === 465,
        auth: { user: _creds.user, pass: _creds.pass },
      });

      await _transporter.sendMail({
        from: `"${_creds.from_name}" <${_creds.from_email}>`,
        to: input.to_email,
        subject: input.subject,
        text: input.body,
      });

      const [_entry] = await ctx.db
        .insert(sent_emails)
        .values({
          user_id: ctx.user.id,
          to_email: input.to_email,
          subject: input.subject,
          body: input.body,
          send_method: 'smtp',
        })
        .returning({
          id: sent_emails.id,
          to_email: sent_emails.to_email,
          subject: sent_emails.subject,
          send_method: sent_emails.send_method,
          sent_at: sent_emails.sent_at,
        });

      return _entry;
    }),

  testSmtp: protectedProcedure
    .mutation(async ({ ctx }) => {
      const _creds = await loadSmtpCredentials(ctx.db, ctx.user.id);
      if (!_creds) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No SMTP credentials configured' });
      }

      const _transporter = nodemailer.createTransport({
        host: _creds.host,
        port: _creds.port,
        secure: _creds.port === 465,
        auth: { user: _creds.user, pass: _creds.pass },
      });

      try {
        await _transporter.verify();
        return { ok: true };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'SMTP verification failed',
        });
      }
    }),

  clearLog: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(sent_emails).where(eq(sent_emails.user_id, ctx.user.id));
  }),
});
