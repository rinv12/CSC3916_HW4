/*
Loureen Viloria
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */
require('dotenv').config();
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
const fs = require('fs');
const mongoose = require("mongoose");
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

            user.save(function(err){
                if (err) {
                    if (err.code == 11000)
                        return res.json({ success: false, message: 'A user with that username already exists.'});
                    else
                        return res.json(err);
                }

                res.json({success: true, msg: 'Successfully created new user.'})
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
    });

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
            if (!req.body){
                res.json({success:false, message: "provide a movie title"});
            }else{
                Movie.findOne(req.body).select("title yearReleased genre actors").exec(function(err, movie) {
                    if (err) {
                        res.status(403).json({success: false, message: "unable to find movie"});
                    }
                    if (movie) {
                        res.status(200).json({success: true, message: "movie found", Movie: movie})
                    } else {
                        res.status(404).json({success: false, message: "movie not found"});

                    }
                })
            }
        }
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
            movie.actors = req.body.actors;

            movie.save(function (err) {
                if (err) {
                    res.status(401).send({success: false, message: "unexpected error occurred."})
                }else{
                    res.status(200).send({success: true, message: "movie successfully added"})
                }
            })
            res.json({success: true, message: 'movie added.'});

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
            var movieReview = new Review();
            Movie.findOne({title: req.body.title}, function (err, movie) {
                if (err) {
                    return res.status(400).json({success: false, message: "Unable to post review"});
                } else if (!movie) {
                    return res.status(400).json({success: false, message: "Movie doesnt exist"});
                } else {
                    movieReview.title = req.body.title;
                    movieReview.user = req.body.user;
                    movieReview.comment = req.body.comment;
                    movieReview.rating = req.body.rating;

                    movieReview.save(function (err) {
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
                        $match: {title: mongoose.Types.string(movie.title)}
                    },{
                        $lookup: {
                            from: "reviews",
                            localField: "title",
                            foreignField: "movie_title",
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


