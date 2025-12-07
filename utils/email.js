const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Natours <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // SendGrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // send to actual email
  async send(template, subject) {
    //1) Render HTML pug
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    //2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html, { wordwrap: 130 }),
    };

    //3) Create a transport and send email
    try {
      await this.newTransport().sendMail(mailOptions);
    } catch (err) {
      // Log the error for debugging
      console.error(
        'Error sending email:',
        err && err.message ? err.message : err
      );

      // In development, write the generated HTML to a preview file so it's easy to inspect
      if (process.env.NODE_ENV !== 'production') {
        try {
          const previewDir = path.join(
            __dirname,
            '..',
            'dev-data',
            'email-previews'
          );
          if (!fs.existsSync(previewDir))
            fs.mkdirSync(previewDir, { recursive: true });
          const previewPath = path.join(previewDir, `email-${Date.now()}.html`);
          fs.writeFileSync(previewPath, html, 'utf8');
          console.log(`Wrote email preview to: ${previewPath}`);
        } catch (writeErr) {
          console.error('Failed to write email preview file:', writeErr);
        }
      }

      // Re-throw so callers can handle it if they want
      throw err;
    }
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to Natours Family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password Reset token (vaild for 10 min only)'
    );
  }
};
