var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try{
    mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log('connected'));
}catch (error){
    console.log('cannot connect');
}
mongoose.set('useCreateIndex', true);

var reviewSchema = new Schema({
    name: {type: String, required: true},
    title: {type: String, required: true},
    quote: {type: String, required: true},
    rating: {type: String, required: true}
});

module.exports = mongoose.model('Review', reviewSchema);