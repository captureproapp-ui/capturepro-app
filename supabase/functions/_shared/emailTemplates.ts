export function getInvitationEmailTemplate(params: {
  recipientName: string;
  inviterName: string;
  organisationName: string;
  acceptInviteUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to CapturePro</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f7fa;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      width: 120px;
      height: auto;
    }
    h1 {
      color: #1e3a8a;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      margin-bottom: 15px;
      font-size: 16px;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #0ea5e9;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 25px 0;
    }
    .cta-container {
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .info-box {
      background-color: #eff6ff;
      border-left: 4px solid #0ea5e9;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://capturepro.work/brand/image.png" alt="CapturePro">
    </div>

    <h1>You've been invited to join CapturePro</h1>

    <p>Hi ${params.recipientName},</p>

    <p>${params.inviterName} has invited you to join <strong>${params.organisationName}</strong> on CapturePro.</p>

    <p>CapturePro is a professional installation documentation platform designed to streamline your PAS2030 compliance workflow.</p>

    <div class="info-box">
      <strong>What you'll be able to do:</strong>
      <ul style="margin: 10px 0;">
        <li>Document installations with photo evidence</li>
        <li>Generate PAS2030-compliant reports</li>
        <li>Manage properties and openings</li>
        <li>Collaborate with your team</li>
      </ul>
    </div>

    <div class="cta-container">
      <a href="${params.acceptInviteUrl}" class="cta-button">Accept Invitation & Set Password</a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${params.acceptInviteUrl}" style="color: #0ea5e9; word-break: break-all;">${params.acceptInviteUrl}</a>
    </p>

    <div class="footer">
      <p>This invitation was sent to you by ${params.inviterName}.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} CapturePro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getWelcomeEmailTemplate(params: {
  recipientName: string;
  organisationName: string;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CapturePro</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f7fa;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      width: 120px;
      height: auto;
    }
    h1 {
      color: #1e3a8a;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      margin-bottom: 15px;
      font-size: 16px;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #0ea5e9;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 25px 0;
    }
    .cta-container {
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://capturepro.work/brand/image.png" alt="CapturePro">
    </div>

    <h1>Welcome to CapturePro!</h1>

    <p>Hi ${params.recipientName},</p>

    <p>Your account has been successfully created for <strong>${params.organisationName}</strong>.</p>

    <p>You can now start documenting installations, managing properties, and generating professional PAS2030-compliant reports.</p>

    <div class="cta-container">
      <a href="${params.loginUrl}" class="cta-button">Sign In to CapturePro</a>
    </div>

    <div class="footer">
      <p>Need help? Contact your administrator or visit our support documentation.</p>
      <p>&copy; ${new Date().getFullYear()} CapturePro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getRegistrationEmailTemplate(params: {
  recipientName: string;
  organisationName: string;
  registrationUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your CapturePro Registration</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f7fa;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      width: 120px;
      height: auto;
    }
    h1 {
      color: #1e3a8a;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      margin-bottom: 15px;
      font-size: 16px;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #0ea5e9;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 25px 0;
    }
    .cta-container {
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .info-box {
      background-color: #eff6ff;
      border-left: 4px solid #0ea5e9;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-badge {
      background-color: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      margin-bottom: 20px;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://capturepro.work/brand/image.png" alt="CapturePro">
    </div>

    <div style="text-align: center;">
      <span class="success-badge">Payment Successful</span>
    </div>

    <h1>Welcome to CapturePro!</h1>

    <p>Hi ${params.recipientName},</p>

    <p>Thank you for subscribing to CapturePro! Your payment has been processed successfully and your organisation <strong>${params.organisationName}</strong> is ready to go.</p>

    <p>To get started, please complete your registration by setting up your password:</p>

    <div class="cta-container">
      <a href="${params.registrationUrl}" class="cta-button">Complete Registration</a>
    </div>

    <div class="info-box">
      <strong>What's next?</strong>
      <ul style="margin: 10px 0;">
        <li>Set your secure password</li>
        <li>Access your admin dashboard</li>
        <li>Start documenting installations</li>
        <li>Invite your team members</li>
      </ul>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${params.registrationUrl}" style="color: #0ea5e9; word-break: break-all;">${params.registrationUrl}</a>
    </p>

    <div class="footer">
      <p>This email was sent because you recently purchased a CapturePro subscription.</p>
      <p>Need help? Contact us at <a href="https://www.capturepro.work/support" style="color: #0ea5e9;">support@capturepro.work</a></p>
      <p>&copy; ${new Date().getFullYear()} CapturePro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getReportNotificationTemplate(params: {
  recipientName: string;
  propertyAddress: string;
  reportUrl: string;
  generatedBy: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Report Available</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f7fa;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      width: 120px;
      height: auto;
    }
    h1 {
      color: #1e3a8a;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      margin-bottom: 15px;
      font-size: 16px;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #0ea5e9;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 25px 0;
    }
    .cta-container {
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .property-info {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://capturepro.work/brand/image.png" alt="CapturePro">
    </div>

    <h1>New Report Available</h1>

    <p>Hi ${params.recipientName},</p>

    <p>A new PAS2030 compliance report has been generated and is ready for review.</p>

    <div class="property-info">
      <strong>Property Address:</strong><br>
      ${params.propertyAddress}
    </div>

    <p>Report generated by: <strong>${params.generatedBy}</strong></p>

    <div class="cta-container">
      <a href="${params.reportUrl}" class="cta-button">View Report</a>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} CapturePro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}