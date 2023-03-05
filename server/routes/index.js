import express from 'express';
export let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('account', { title: 'Express' });
});
