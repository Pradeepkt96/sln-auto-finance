// OTP service handling console-based logging (Fallback to actual SMS disabled based on user preference)

const sendOTP = async (mobile, otp, language = 'en') => {
  try {
    let message = '';
    
    if (language === 'ta') {
      message = `ஸ்ரீ லட்சுமி நாராயணா ஆட்டோ ஃபைனான்ஸ்\n\nஉங்கள் OTP: ${otp}\n\nஇந்த OTP 5 நிமிடங்களுக்கு மட்டுமே செல்லுபடியாகும்.\n\nஇதனை யாருடனும் பகிர வேண்டாம்.`;
    } else {
      message = `Your OTP is ${otp}. Valid for 5 minutes. Do not share.`;
    }

    // Since third-party SMS is disabled for costs, we log it to console only.
    console.log(`\n================= SMS NOTIFICATION =================`);
    console.log(`To: ${mobile}`);
    console.log(`Message:\n${message}`);
    console.log(`====================================================\n`);
    
    return true;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
};

module.exports = { sendOTP };
