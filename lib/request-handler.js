var request = require('request');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var util = require('../lib/utility');

var db = require('../app/config').db;
var User = require('../app/config').User;
var Link = require('../app/config').Url;
// var Users = require('../app/collections/users');
// var Links = require('../app/collections/links');

exports.renderIndex = function(req, res) {
  res.render('index');
};

exports.signupUserForm = function(req, res) {
  res.render('signup');
};

exports.loginUserForm = function(req, res) {
  res.render('login');
};

exports.logoutUser = function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
};

exports.fetchLinks = function(req, res) {
  Links.exec(function(links) {
    res.status(200).send(links.models);
  });
};

exports.saveLink = function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  Link.findOne({ url: uri }).exec(function(err, found) {
    if (found) {
      res.send(200, found);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        } else {
          var newLink = new Link({
            url: uri,
            title: title,
            baseUrl: req.headers.origin,
            visits: 0
          });
          newLink.save(function(err, link) {
            if (err) {
              res.send(500, err);
            } else {
              res.send(200, link);
            }
          });
        }
      });
    }
  });
};
exports.navToLink = function(req, res) {
  Link.findOne({code: req.params[0]}).exec(function(err, link) {
    if (!link) {
      res.redirect('/');
    } else {
      link.visits++;
      link.save(function(err, link) {
        return res.redirect(link.url);
      });
    }
  });
};

exports.loginUser = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  User.findOne({ username: username }).exec(function(err, user) {
    if (!user) {
      return res.redirect('/login');
    } else {
      user.comparePassword(password, function(match) {
        if (match) {
          console.log('<><>');
          util.createSession(req, res, user);
        } else {
          console.log('><><');
          res.redirect('/login');
        }
      });
    }
  });
};
// var newLink = new Link({
//   url: uri,
//   title: title,
//   baseUrl: req.headers.origin,
//   visits: 0
// });
exports.signupUser = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  User.findOne({ username: username }).exec(function(err, user) {
    if (!user) {
      var newUser = new User({
        username: username,
        password: password
      });
      newUser.save(function(err, newUser) {
        util.createSession(req, res, newUser);
      });
    } else {
      console.log('Account already exists');
      res.redirect('/signup');
    }
  });
};
