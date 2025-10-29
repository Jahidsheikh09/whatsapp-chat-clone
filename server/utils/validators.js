const validator = require("validator");

// Check if n is a number or numric string
const isNumber = (n) => !isNaN(parseFloat(n)) && isFinite(n);

const isValidJSON = (text) => {
  if (typeof text !== "string") {
    return false;
  }

  try {
    var json = JSON.parse(text);
    return typeof json === "object";
  } catch (error) {
    return false;
  }
};
const isAlphaNumeric = (str) => {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (
      !(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code > 96 && code < 123) // lower alpha (a-z)
    ) {
      return false;
    }
  }
};

const isIMEIValid = (imei) => {
  imei = String(imei);
  const regExp = /^[a-zA-Z0-9]{1,15}$/;
  if (imei.match(regExp)) return true;
  return false;
};

const isEmailValid = (email) => {
  if (!email) return true;
  else return validator.isEmail(email);
};

const isUsernameValid = (username) => {
  const regExp = /^[A-Za-z0-9_\/\-]{3,20}$/;
  if (!username) return true;
  else if (username.match(regExp)) return true;
  return false;
};

const isMobilePhone = (phone) => {
  if (!phone) return true;
  console.log(
    'validator.isMobilePhone(phone, "en-IN")',
    validator.isMobilePhone(phone, "en-IN")
  );
  return validator.isMobilePhone(phone, "en-IN");
};

const timeValidator = (time) => {
  if (time === "") return true;

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

const isHumanName = (name) => {
  if (!name) return true;
  return validator.isAlpha(name.replaceAll(" ", "").replaceAll(".", ""));
};

const isAadharValid = (aadharNumber) => {
  if (!aadharNumber) return false;
  aadharNumber = String(aadharNumber);
  const regExp = /^\d{12}$/;
  return regExp.test(aadharNumber);
};

module.exports = {
  isNumber,
  isValidJSON,
  isAlphaNumeric,
  isIMEIValid,
  isEmailValid,
  isUsernameValid,
  isMobilePhone,
  timeValidator,
  isHumanName,
  isAadharValid
};
