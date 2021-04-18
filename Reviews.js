var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try{
    mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log('connected'));
}catch (error){
    console.log('cant connect');
}
mongoose.set('useCreateIndex', true);

var reviewSchema = new Schema({

    movie_id: {type: Schema.Types.ObjectId, ref: "movieSchema", required: true},
    user_id: {type: Schema.Types.ObjectId, ref: "userSchema", required: true},
    username:{type: String, required: true},
    comment: {type: String, required: true},
    rating: {type: Number, required: true, min: 1, max: 5}
});
reviewSchema.pre('save', function (next){
    next();
});
module.exports = mongoose.model('Review', reviewSchema);