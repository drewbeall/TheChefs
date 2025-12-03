let mysql = require('mysql2');

let con = mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "rootpassword",
  database: "IS436"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  let sql = "INSERT INTO RECIPE (url, content) VALUES ('https://www.tiktok.com/@cookingwithlynja/video/7322531619825257771','conent here')";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
  });
});
