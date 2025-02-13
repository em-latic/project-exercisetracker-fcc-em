const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

let bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use('/', (req, res, next) => {
  const ip = req.ip;
  const method = req.method;
  const path = req.path;
  console.log(`${method} ${path} request by ${ip}`);
  next();
});

app.use( bodyParser.urlencoded({ extended : false }) );

//------------------------------------------------- -------------------------------------------------
// __________________________________ RESTful API mehods:


// HTML Sever: serve static files
app.get('/', (req, res) => {
  const absolutePath = __dirname + './views/index.html';
  res.sendFile(absolutePath);
});


//__________________________________ USERS __________________________________:

const User = require("./mongoDB.js").UserModel;
const Exercise = require("./mongoDB.js").ExerciseModel;

// _____ Create User:
const createUser = require("./mongoDB.js").createUser;
app.post('/api/users', async (req, res) => {
  console.log("Cretaing user...");

  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const newUser = await createUser(username);

    if(!newUser) {
      console.log("Creating new user failed");
      return res.status(400).send("Creating new user failed");
    }
    console.log("New user created");
    res.status(201).json(newUser);
  } 
  catch(e) {
    console.log("Error when creating new user", e);
    res.status(500).json({ error: "Internal server error" });
  } 
});


// _____ Retrieve All | one by Username:
const getAllUsers = require("./mongoDB.js").getAllUsers;
const getUserByName = require("./mongoDB.js").getUserByName;

app.route('/api/users')
.get( async (req, res) => {

  const { username } = req.query;

  if(username) {
    const user = await getUserByName(username);

    if(user){
      return res.status(200).json(user);
    }
    else{
      console.log(`User with ${username} username was not found`);
      return res.status(404).send("User not found");
    }
  }
  const userList = await getAllUsers();
  res.status(200).json(userList);
});


// _____ Get User by ID:
const getUserById = require("./mongoDB.js").getUserById;

app.get('/api/users/:_id', async (req, res) => {
  const user = await getUserById(req.params._id);
  if(user){
    res.status(200).json(user);
  }
  else{
    res.status(404).send("User not found");
    console.log(`User with given ID was not found`);
  }
});



//__________________________________ Exercises __________________________________:

// POST /api/users/:_id/exercises

//const updateUser = require("./mongoDB.js").updateUser;
const createExercise = require("./mongoDB.js").createExercise;


// Helper function to validate input data
// ** given the rigurous validation needed, even for just 3 simple fields:
//    --> consider using validation library ==> JOI !
const validateExercise = ( description, duration, date) => {
  let error;
  let result = { "isError": 0, "response": {} };

  if(!description || !duration){
    console.log("[Description] or [Duration] are missing");
    error = "Missing necessary data for Exercise";
    result = { "isError": 1, "response": error };
    return result;
  }

  /* 
  if (typeof description !== 'string' || description.trim() === "") {
    return res.status(400).json({ error: "Invalid description: must be a non-empty string" });
  }
  */
  if(isNaN(duration) || parseInt(duration) <= 0) {
    error = "[Duration] needs to be a valid positive number";
    result = { "isError": 1, "response": error };
    return result;
  }

  let newDate = new Date();
  if(date){
    const formDate = new Date(date);
    if(isNaN(formDate)){
      error="Invalid date format";
      result = { "isError": 1, "response": error };
      return result;
    }
    newDate = formDate;
  }

  const exercise = { description: description.trim(), duration: Number(duration), date: newDate };
  result = { "isError": 0, "response": exercise };
  return result;
};


app.post('/api/users/:_id/exercises', async(req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  const validationResp = validateExercise(description, duration, date);
  if (validationResp.isError) {
    console.log(validationResp.response);
    return res.status(400).send("Wrong data format in input request");
  }

  const exerciseData = validationResp.response;
  const user = await getUserById(userId);
  const exercise = new Exercise({
    username: user.username,
    description: exerciseData.description,
    duration: exerciseData.duration,
    date: exerciseData.date
  });

  try{
    //const updatedUser = await updateUser(userId, exerciseData);
    const newExercise = await createExercise(exercise);

    if(!newExercise){
      console.log("Creating Exercise for User failed");
      return res.status(400).send("Creating Exercise for User failed");
    }

    // Prepare response in expected format:
    const resObject = {
      username: newExercise.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: userId
    };
    res.status(201).json(resObject);
  }
  catch(e) {
    console.log("Error when updating user ", e);
    res.status(500);
  }
});


//__________________________________ LOGS __________________________________:

const getExercLogByUsername = require("./mongoDB.js").getExercisesByUserName;

app.get('/api/users/:_id/logs', async (req, res) => {

  const { from, to, limit } = req.query;

  if(limit && (isNaN(limit) || limit <= 0)) {
    console.log(`Cannot limit query to ${limit} results.`);
    return res.status(400).send("Limit number has to be positive int.");
  }

  try {
    const user = await getUserById(req.params._id);
    const log = await getExercLogByUsername(user.username, from, to, limit);
    if (!log) {
      console.log("No exercise log found for given user");
      return res.status(404).send("No Exercise log was found for given user ID");
    }

    // FROM date query filter --> BETTER to use Mongo DB queries + modifying Arrays structure by index in loop is NOT recommended
    // if(from) {
    //   const fromDate = new Date(from);
    //   if(isNaN(fromDate)){ return res.status(400).send("Wrong [from] date format."); }
    //   log.forEach(exercise => {
    //     const exercDate = new Date(exercise.date);
    //     const index = log.indexOf(exercise);
    //     if(exercDate < fromDate) { log.splice(index, 1); }
    //   });
    // }

    res.status(200).json({
      username: user.username,
      from: new Date(from).toDateString(),
      to: new Date(to).toDateString(),
      count: log.length,
      _id: user._id,
      log: log.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
    });
  }
  catch(e) {
    const errRegex = new RegExp(e.message);
    if( errRegex.test(/Wrong .+ date format./)){
      console.log(e.meassage);
      return res.status(400).send(e.message);
    }
    console.error(e);
    res.status(500).send("Internal Server Error");
  }
});


/*
app.route('/name')
    .get((req, res) => {
        const firstName = req.query.first;
        const lastName = req.query.last;
        const fullName = `${firstName} ${lastName}`;

        res.json({ name: fullName });
    })
    .post((req, res) => {
        const firstName = req.body.first;
        const lastName = req.body.last;
        const fullName = `${firstName} ${lastName}`;

        res.json({ name: fullName });
    });
*/


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
