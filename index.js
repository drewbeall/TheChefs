const express=require('express');
const users=require("./MOCK_DATA.json");
const fs=require('fs')
const app=express();

const PORT=8000;

// Serve static files from public directory
app.use(express.static('public'));

app.use(express.urlencoded({extended:false}));

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Express Todo API",
    endpoints: {
      todos: "  ",
      todosAxios: "/api/todoaxios",
      users: "/api/users",
      userById: "/api/users/:id"
    }
  });
});

//get all todo data
app.get("/api/todo", async (req, res) => {
  try {
    const response = await fetch("https://dummyjson.com/todos");
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});


const axios = require("axios");

app.get("/api/todoaxios", async (req, res) => {
  try {
    const response = await axios.get("https://dummyjson.com/todos");
    return res.json(response.data);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});


//GET all data
app.get("/api/users", (req, res) => {   
   return res.json(users);
});


//GET all data
app.get("/api/users/:id", (req, res) => {     
   const { id } = req.params;
   const user = users.find(u => u.id === parseInt(id));
   if (user) {
      return res.json(user);
   } else {
      return res.status(404).json({ message: "User not found" });
   }
});


app.post("/api/users",(req,rep)=>{
    const body=req.body;
    users.push({...body, id: user.length+1});
    fs.writeFile('./MOCK_DATA.json',JSON.stringify(users),(err,data) => {
      return res.json({status:"success", id:users.length+1})
    });
    console.log("body",body);

    returns.json({status:"pending"})
});


app.patch("/api/users/:id",(req,rep)=>{
    returns.json({status:"pending"})
});

app.delete("/api/users/:id",(req,rep)=>{
    returns.json({status:"pending"})
});



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));