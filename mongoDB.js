require('dotenv');
const mongoose = require('mongoose');

const dbConn = process.env.MONGO_URI;
mongoose.connect(dbConn, { useNewUrlParser: true, useUnifiedTopology: true });

// Definition of document Schemas:
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }
});

const exerciseSchema = new mongoose.Schema({
    username: { type: String, required: true }, 
    description: { type: String, required: true }, 
    duration: { type: Number, required: true }, 
    date: Date
});

// Models Creation:
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);


//CR(UD) methods:
//____________________________________________

// Users:
const createUser = async (username) => {
    const newUser = new User({ username: username });
    return await newUser.save();
};
const getUserById = async (id) => {
    return await User.findById(id);
};
const getUserByName = async (username) => {
    return await User.findOne({ username: username });
};
const getAllUsers = async () => {
    return await User.find();
};

const updateUser = async (id, updateData) => {
    const updatedUser = await User.findByIdAndUpdate(id, updateData);
    console.log(`Update data: ${JSON.stringify(updateData)}`);
    console.log(`Updated user: ${JSON.stringify(updatedUser)}`);
    return updatedUser;
};


// Exercises:
const createExercise = async (exercise) => {
    const newExercise = new Exercise(exercise);
    return await newExercise.save();
};

const getExercisesByUserName = async (username, from, to, limit) => {
    let query = Exercise.find( { username: username } )
    .select({ description: 1, duration: 1, date: 1, _id: 0 });

    if(limit) {
        query = query.limit(limit);
    }

    if(from||to){
        query.where('date'); // if defined a date filter, prepare 'date' fields

        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate)) {
                throw new Error("Wrong [from] date format.");
            }
            query.gte(fromDate);
        }
        if (to) {
            const toDate = new Date(to);
            if (isNaN(toDate)) {
                throw new Error("Wrong [to] date format.");
            }
            query.gte(toDate);
        }
    }

    return await query.exec();
};

// exports of CRUD methods on DB:
exports.UserModel = User;
exports.createUser = createUser;
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.getUserByName = getUserByName;
exports.updateUser = updateUser;

exports.ExerciseModel = Exercise;
exports.createExercise = createExercise;
exports.getExercisesByUserName = getExercisesByUserName;
