var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

try{
    mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log('connected'));
}catch (error){
    console.log('cannot connect');
}
mongoose.set('useCreateIndex', true);

var movieSchema = new Schema({
    title:{
        type: String,
        trim: true,
        required: 'Title required',
    },
    yearReleased:{
        type: String,
        trim: true,
        required: 'Year released is required',
    },
    genre:{
        type: String,
        required: true,
        enum:["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Thriller", "Western"],
    },
    actors:
    [
        {actor_name: {type: String, required: true}, character_name:{type:String, required: true}},
        {actor_name: {type: String, required: true}, character_name:{type:String, required: true}},
        {actor_name: {type: String, required: true}, character_name:{type:String, required: true}}]
});

//exporting model back to the server
module.exports = mongoose.model('Movies', movieSchema)