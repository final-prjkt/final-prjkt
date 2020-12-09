const express = require('express')
const mongoose = require('mongoose')
const Article = require('./models/article')
const ChatRoomManager = require('./web_sockets/chatroom');
const articleRouter = require('./routes/articles')
const methodOverride = require('method-override')
const bodyParser = require('body-parser');
const user_auth = require('./auth/user_auth');
const { use } = require('marked')
const user = require('./models/user')
const session = require('express-session');
const app = express();

const SESSION_KEY = "F029JF90JDASFKJFJDS029FJ";

// Chatroom Manager
const serverCRM = new ChatRoomManager();

mongoose.connect('mongodb://localhost/blog', {
  useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true
})

app.set('view engine', 'ejs')
app.use(session({ secret: SESSION_KEY, saveUninitialized: true, resave: true }))
app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(user_auth.isAuthenticated)

app.use('/assets', express.static('assets'))

app.get('/', async (req, res) => {
  const user_data = req.user_data;
  const articles = await Article.find().sort({ createdAt: 'desc' })
  res.render('articles/index', { articles: articles, user_data: user_data })
});

app.get('/sign_up', async (req, res) => {
  res.render('articles/sign_up')
});

app.get('/sign_in', async (req, res) => {
  res.render('articles/sign_in', { error: null });
});

app.get('/security', async (req, res) => {
  // Validate user auth
  if (!req.session.user_name) {
    res.redirect("/");
    return;
  }

  // Move user to security
  const userName = req.session.user_name;
  res.render('articles/security', { user_name: userName });
});

app.post('/logout', async (req, res) => {
  req.session.user_name = null;
  req.session.token = null;

  res.redirect('/');
});

app.get('/chat_room/:room_id', async (req, res) => {
  // Determine if user is logged in
  if (!req.session.user_name) {
    res.redirect('/sign_in');
    return;
  }
  const room_id = req.params.room_id;

  if (!room_id) {
    res.redirect('/');
    return;
  }

  // Determine if valid room_id
  const article = await Article.findOne({ room_id: req.params.room_id });

  // Redirect to home page if no article was found
  if (!article) {
    res.redirect('/');
    return;
  }

  // Create chat room if it doesn't exist
  if (!serverCRM.hasExistingRoom(room_id)) {
    serverCRM.createRoom(room_id);
  }

  // Get existing messages
  const messages = serverCRM.getRoomMessages(room_id);

  // If user is logged in, redirect to appropriate chat room
  res.render('articles/chat_room', { messages: messages, room_id: room_id, user_name: req.session.user_name });
});

app.post("/sign_up", async (req, res) => {
  const userName = req.body.user_name;
  const password = req.body.password;
  const dupPassword = req.body.rePassword;

  // Sanitise input
  if (!userName || !password || !dupPassword) {
    res.sendStatus(400);
    return;
  }

  // Sanitise passwords
  if (password != dupPassword) {
    res.sendStatus(400);
    return;
  }

  // Generate user
  const success = await user_auth.createNewUser(userName, password);

  if (!success) {
    res.sendStatus(300);
    return;
  }

  // Attach data to session

  res.redirect('/');
});

app.post("/auth", async (req, res) => {
  const userName = req.body.user_name;
  const password = req.body.password;

  console.log(req.body.user_name)
  // Determine if inputs are valid
  if (!userName || !password) {
    res.render("articles/sign_in", { error: "You forgot to fill in one of the fields."});
    return;
  }

  // Determine if user provided the correct credientials
  const userIsAuthenticated = await user_auth.authenticateUser(userName, password);
  if (!userIsAuthenticated) {
    res.render("articles/sign_in", { error: "There was an error with the credentials provided."});
    return;
  }

  console.log("user is authenticated")

  // Generate JWT for user
  const token = await user_auth.generateJWT(userName);

  // Generate response
  req.session.token = token;
  req.session.user_name = userName;

  res.redirect("/");
});

// Setup Server

app.use('/articles', articleRouter)

app.listen(5000)