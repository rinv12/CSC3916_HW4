/*
Loureen Viloria
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

//new
//const fs = require('fs');
var mongoose = require('mongoose');
var rp = require('request-promise');
const crypto = require('crypto');
var app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.route('/signup')
    .post(function(req, res) {
        if (!req.body.username || !req.body.password) {
            res.json({success: false, msg: 'Please include both username and password to signup.'})
        } else {
            var user = new User();
            user.name = req.body.name;
            user.username = req.body.username;
            user.password = req.body.password;

            user.save(function (err, user) {
                if (err) {
                    return res.json({success: false, message: "username already exists"});
                }else{
                    return res.json({success: true, msg: 'new user successfully created', User : user});
                }
            });
        }
    })
    .all(function (req, res){
        res.json({success: false, msg: 'method not supported'});
    });

router.route('/signin')
    .post(function (req, res) {
        var userNew = new User();
        userNew.username = req.body.username;
        userNew.password = req.body.password;

        User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
            if (err) {
                res.send(err);
            }

            User.comparePassword(userNew.password, function(isMatch) {
                if (isMatch) {
                    var userToken = { id: user.id, username: user.username};
                    var token = jwt.sign(userToken, process.env.SECRET_KEY);
                    res.json ({success: true, token: 'JWT ' + token});
                }
                else {
                    res.status(401).send({success: false, msg: 'Authentication failed.'});
                }
            })
        })
    })

router.route('/movies')
    .put(authJwtController.isAuthenticated, function(req, res){
        if(!req.body.title || !req.body.update){
            res.json({success:false, message: "old title and new title required"});
        }else{
            Movie.findOneAndUpdate(req.body.title, req.body.update, function(err, movie) {
                if(err){
                    res.status(403).json({success:false, message: "cant update movie"});
                }else if(!movie){
                    res.status(403).json({success: false, message: "cant update movie"});
                }else{
                    res.status(200).json({success: true, message:"successfully updated movie title"});
                }
            });
        }
    })
    .delete(authJwtController.isAuthenticated, function (req, res){
        if(!req.body.title){
            res.json({success:false, message:"provide movie title to delete"});
        }else{
            Movie.findOneAndDelete(req.body.title, function(err, movie){
                if(err){
                    res.status(403).json({success:false, message:"cant delete movie"});
                }else if(!movie){
                    res.status(403).json({success:false, message: "cant find movie"});
                }else{
                    res.status(200).json({success:true, message: "movie deleted"})
                }
            })
        }
    })
    .get(authJwtController.isAuthenticated, function (req, res){
        if (req.query && req.query.reviews && req.query.reviews === "true") {

            Movie.find(function (err, movies) {
                console.log(movies);
                if (err) {
                    return res.status(403).json({success: false, message: "cant find/get any reviews for movie"});
                } else if (!movies) {
                    return res.status(403).json({success: false, message: "cant find movie title"});
                } else {
                    Movie.aggregate([
                        {
                            $lookup: {
                                from: "reviews",
                                localField: "_id",
                                foreignField: "movie_id",
                                as: "MovieReview"
                            }
                        },
                        {
                            $addFields: {
                                AverageReviews: {$avg: "$MovieReview.rating"}
                            }
                        },
                        {
                            $sort: {AverageReviews : -1}
                        }
                    ]).exec(function (err, movie) {
                        if (err) {
                            return res.json(err);
                        } else {
                            return res.json({movie : movie});
                        }
                    })
                }
            })
        }else{
            Movie.find(function(err, movies){
                if(err){
                    res.send(err);
                }else{
                    return res.json(movies).status(200).end();
                }

            })

        }}
    )
    .post(authJwtController.isAuthenticated, function (req,res){
        console.log(req.body);
        if(!req.body.title || !req.body.yearReleased || !req.body.genre || !req.body.actors[0] || !req.body.actors[1] || !req.body.actors[2]) {
            res.json({success: false, message: "title, released year, genre, and three actors required"});
        }else{
            var movie = new Movie();

            movie.title = req.body.title;
            movie.yearReleased = req.body.yearReleased;
            movie.genre = req.body.genre;
            movie.imageUrl = req.body.imageURL;
            movie.actors = req.body.actors;

            Movie.find({title:req.body.title}, function(err, movies){
                if(err){
                    return res.json(err);
                }else if(movies.length <= 0){
                    movie.save(function (err) {
                        if (err) {
                            return res.json(err);
                        }else{
                            res.json({success: true, msg: 'Movie added', Movie : movie});
                        }
                    })
                }else{
                    return res.json({success: false, message : "Movie already in database"})
                }
            })
        }
    })

    .all(function(req, res){
        res.json({success:false, message: "route not supported"});
    })

router.route('/reviews')
    .get(function (req, res){
        if(!req.body.title){
            res.json({success: false, message: "cant find a review for the movie"});
        }else if(req.query.reviews == "true"){
            Movie.findOne({title: req.body.title}, function (err, movie){
                if(err){
                    return res.status(400).json({success: false, message: "cant find movie"});
                }else if(!movie){
                    return  res.status(400).json({success: false, message: "movie not in database"});
                }else{
                    Movie.aggregate([
                        {$match :
                                {title: req.body.title}},
                        {$lookup:
                                {from: "reviews", localField: "title", foreignField: "title", as:"review"}},
                        {$addFields:
                                {averageRate: {$avg: "$review.rating"}}}
                    ]).exec(function(err, movie){
                        if(err){
                            return res.json(err);
                        }else{
                            return res.json(movie);
                        }
                    })
                }
            })
        }else{
            Movie.find({title: req.body.title}).select("title yearReleased genre actors").exec(function(err, movie){
                if(err){
                    return res.status(404).json({success: false, message: "cant find movie"});
                }else{
                    return res.status(200).json({success: true, message: "movie found", Movie: movie});
                }
            })
        }
    })
    .post(authJwtController.isAuthenticated, function (req,res){
        console.log(req.body);
        if(!req.body.title || !req.body.user || !req.body.comment || !req.body.rating) {
            return res.json({success: false, message: "title, username, comment, rating required"});
        }else{
            var review = new Review();
            Movie.findOne({title: req.body.title}, function (err, movie) {
                if (err) {
                    return res.status(400).json({success: false, message: "Unable to post review"});
                } else if (!movie) {
                    return res.status(400).json({success: false, message: "Movie doesnt exist"});
                } else {
                    review.title = req.body.title;
                    review.username = req.body.username;
                    review.comment = req.body.comment;
                    review.rating = req.body.rating;

                    review.save(function (err) {
                        if (err) {
                            return res.json(err);
                        } else {
                            return res.json({success: true, message: "review saved"});
                        }
                    })
                }
            })
        }
    })

router.route('/movies/:movie_title')
    .get(authJwtController.isAuthenticated, function (req, res){
        if(req.query && req.query.reviews && req.query.reviews === "true"){
            Movie.findOne({title: req.params.movie_title}, function (err, movie){
                if(err){
                    return res.status(404).json({success:false, message: "Unable to find movie"});
                }else if(!movie){
                    return res.status(403).json({success: false, message: "Movie doesn't exist"});
                }else{
                    Movie.aggregate([{
                        $match: {title: mongoose.Types.string(movie._id)}
                    },{
                        $lookup: {
                            from: "reviews",
                            localField: "_id",
                            foreignField: "movie_id",
                            as: "MovieReview"
                        }
                    },
                        {
                            $addFields:{
                                AverageReviews: {$avg: "$MovieReview.rating"}
                            }
                        }
                        ]).exec(function(err,movie){
                            if(err){
                                return res.json(err);
                            }else{
                                return res.json({movie: movie});
                            }
                    })
                }
            })
        }else{
            Movie.find({title: req.params.movie_title}).select("title yearReleased genre actors").exec(function(err, movie){
                if(err){
                    return res.status(404).json({success: false, message: "unable to find movie"});
                }else if(movie.length <= 0){
                    return res.status(403).json({success: false, message: "movie doesn't exist"});
                }else{
                    return res.status(200).json({success: true, message: "Movie found", Movie: movie})
                }
            })
        }
    })
app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


