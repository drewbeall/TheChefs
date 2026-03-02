const bcrypt = require("bcrypt");

const myPlaintextPassword = "thisisapassword";
const hash = bcrypt.hashSync(myPlaintextPassword, 12);
console.log(hash);

const result = bcrypt.compareSync("thisisapassword", hash);
console.log(result);