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
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
};

exports.saveLink = function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  var query = Link.findOne({ url: uri });
  query.exec(function(err, link) {
    if (err) {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        } else {
          var shasum = crypto.createHash('sha1');
          shasum.update(uri);
          var code = shasum.digest('hex').slice(0, 5);
          // console.log('<><>', code);
          // console.log('><><', uri);
          var newLink = new Link({
            url: uri,
            title: title,
            baseUrl: req.headers.origin,
            code: code
          });
          newLink.save(function(err, link) {
            if (err) {
              console.log(err);
            } else {
              res.status(200).send(newLink);
            }
          });
        }
      });
    } else {
      // console.log(link);
      res.status(200).send(link);
    }
  });
};
exports.navToLink = function(req, res) {
  var query = Link.findOne({code: req.params[0]});

  query.exec(function(err, link) {
    if (err) {
      res.redirect('/');
    } else {
      Link.update({code: req.params[0]}, { $set: { visits: link.visits + 1 } }, function(err, link) {
        if (err) {
          console.log(err);
        } else {
          res.redirect(link.url);
        }
      });
    }
  });



  // Link.update(query, req.params[0], {upsert:true}, function(err, ))

  // new Link({ code: req.params[0] }).fetch().then(function(link) {
  //   if (!link) {
  //     res.redirect('/');
  //   } else {
  //     link.set({ visits: link.get('visits') + 1 })
  //       .save()
  //       .then(function() {
  //         return res.redirect(link.get('url'));
  //       });
  //   }
  // });
};

exports.loginUser = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username })
    .fetch()
    .then(function(user) {
      if (!user) {
        res.redirect('/login');
      } else {
        user.comparePassword(password, function(match) {
          if (match) {
            util.createSession(req, res, user);
          } else {
            res.redirect('/login');
          }
        });
      }
    });
};

exports.signupUser = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username })
    .fetch()
    .then(function(user) {
      if (!user) {
        var newUser = new User({
          username: username,
          password: password
        });
        newUser.save()
          .then(function(newUser) {
            Users.add(newUser);
            util.createSession(req, res, newUser);
          });
      } else {
        console.log('Account already exists');
        res.redirect('/signup');
      }
    });
};
