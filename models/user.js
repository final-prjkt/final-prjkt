const mongoose = require('mongoose')
const marked = require('marked')
const slugify = require('slugify')
const createDomPurify = require('dompurify')
const { JSDOM } = require('jsdom')
const dompurify = createDomPurify(new JSDOM().window)

const userSchema = new mongoose.Schema({
  userName: {
      type: String,
      required: true
  },
  passwordHash: {
      type: String,
      required: true
  }
});

module.exports = mongoose.model('User', userSchema);