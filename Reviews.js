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
    username: {type: String, required: true},
    title: {type: String, required: true},
    quote: {type: String, required: true},
    rating: {type: Number, required: true, min: 1, max: 5}
});
reviewSchema.pre('save', function (next){
    next();
})
module.exports = mongoose.model('Review', reviewSchema);