
//MySQL Entries 
/*
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
  let sql = "INSERT INTO RECIPE (url, content) VALUES ('https://www.tiktok.com/@cookingwithlynja/video/7322531619825257771','content here')";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Insert successful");
  });
});
*/

// Postgres Entries

const { Pool, Client } = require("pg");
/*
const pool = new Pool({
  user: 'chefsdb_user',
  password: 'kkOJZbaUrdPaiw6GbKeBCPdTx4FAeGLY',
  host: 'dpg-d4oerl2dbo4c73f1otc0-a.oregon-postgres.render.com',
  port: 5432,
  database: 'chefsdb',
})
 
console.log(await pool.query('SELECT NOW()'))
 */

const client = new Pool({
  user: 'chefsdb_user',
  password: 'kkOJZbaUrdPaiw6GbKeBCPdTx4FAeGLY',  // your real password
  host: 'dpg-d4oerl2dbo4c73f1otc0-a.oregon-postgres.render.com',
  port: 5432,
  database: 'chefsdb',
  ssl: { rejectUnauthorized: false }  // REQUIRED on Render
});

async function validatePG() {
  try {
    //await client.connect();

    const url = "tiktok.com";
    const content = "Content";

    //const result = await client.query('INSERT INTO recipe (url,content) VALUES ($1,$2)',[url,content]);

    const result = await client.query('SELECT recipeID, url, content FROM recipe');

    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    //await client.end();
  }
}

validatePG();