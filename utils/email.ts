const nodemailer = require("nodemailer");

const sendMail = async (options) => {
  // 1) Transporter 
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  // 2) Define the content of the E-mail
  const mailOptions = {
    from: "Deniz Gul <guledoz@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  // 3) Send the E-mail
  await transporter.sendMail(mailOptions);
};

module.exports = sendMail;
