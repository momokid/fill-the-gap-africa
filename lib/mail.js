'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) return null;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
  });

  return transporter;
}

/**
 * Notify the team about a new website enquiry. Failures are logged and never
 * thrown: the message is already stored in the dashboard.
 */
async function notifyEnquiry(message, settings) {
  const tx = getTransporter();
  const to = config.smtp.to || settings.contact_email;

  if (!tx || !to) {
    console.log(`[mail] SMTP not configured — enquiry #${message.id} stored only.`);
    return false;
  }

  try {
    await tx.sendMail({
      from: config.smtp.from,
      to,
      replyTo: `${message.name} <${message.email}>`,
      subject: `[Website] ${message.topic} — ${message.name}`,
      text: [
        `Name: ${message.name}`,
        `Email: ${message.email}`,
        `Phone: ${message.phone || '—'}`,
        `Topic: ${message.topic}`,
        '',
        message.message,
        '',
        '---',
        'Sent from the Fill The Gap Africa website.'
      ].join('\n')
    });
    return true;
  } catch (error) {
    console.error('[mail] could not send enquiry notification:', error.message);
    return false;
  }
}

/** Optional courtesy reply to the sender. Only used when SMTP is configured. */
async function acknowledge(message, settings) {
  const tx = getTransporter();
  if (!tx || !config.smtp.host) return false;

  try {
    await tx.sendMail({
      from: config.smtp.from,
      to: message.email,
      subject: 'We received your message — Fill The Gap Africa',
      text: [
        `Dear ${message.name},`,
        '',
        'Thank you for writing to Fill The Gap Africa. Your message has reached our team and we will reply within two business days.',
        '',
        settings.contact_phone ? `Phone: ${settings.contact_phone}` : '',
        settings.contact_email ? `Email: ${settings.contact_email}` : '',
        '',
        'Fill The Gap Africa'
      ]
        .filter(Boolean)
        .join('\n')
    });
    return true;
  } catch (error) {
    console.error('[mail] could not send acknowledgement:', error.message);
    return false;
  }
}

module.exports = { notifyEnquiry, acknowledge, getTransporter };
