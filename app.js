let express = require('express');
let fs = require('fs');
let cookie_parser = require('cookie-parser');
let body_parser = require('body-parser');
let MongoClient = require('mongodb').MongoClient;
let file_upload = require('express-fileupload');
let app = express();


//Middleware
app.use(express.static('./static'));
app.use(cookie_parser());
app.use(body_parser.urlencoded({extended: false}));
app.use(file_upload());


//Setup template engine
app.set('view engine', 'ejs');
app.set('views', './views');

//Setup mongodb
let url = 'mongodb://localhost:27017';

MongoClient.connect(url, (err, client) => {
    console.log('Connect to Mongodb success.');
    if (err) {console.log(err);}
    let db = client.db('hotornot');
    let users = db.collection('users')
    let categories = db.collection('categories');
    let photos = db.collection('photos');

    //Routing
    app.get('/', (req, res) => {
        console.log('Request to /');
        if (req.cookies.login === 'true') {
            res.redirect('/categories');
        } 
        else {
            res.redirect('/index');
        }
        res.end();
    });

    app.get('/index', (req, res) => {
        console.log('Request to /index');
        res.render('index', {email: req.cookies.email, login: req.cookies.login});
    });

    app.get('/about', (req, res) => {
        console.log('Request to /about');
        res.render('about', {email: req.cookies.email, login: req.cookies.login});
    });

    app.get('/contact', (req, res) => {
        console.log('Request to /contact');
        res.render('contact', {email: req.cookies.email, login: req.cookies.login});
    });

    app.get('/categories', (req, res) => {
        if (req.query.category && req.query.photo) {
            photos.findOne({category: req.query.category, photo_number: parseInt(req.query.photo)}, (err, result) => {
                if (err) {console.log(err);}

                let category = req.query.category;
                let photo = req.query.photo;
                let photo_path = 'photos/' + category + '/photo' + photo + '.jpg';
                console.log('Request to /categories?category=' + category + '&photo=' + photo);

                //Generate url for 'Next' and 'Prev' button
                let photos_number = fs.readdirSync('./static/photos/' + category).length;
                let photo_next = 0;
                let photo_prev = 0;
                let display_next = '';
                let display_prev = '';

                if (photos_number === 0) {
                    res.render('category', {source: photo_path, photos_number: photos_number, category: category, photo: photo, photo_next: photo_next, photo_prev: photo_prev, display_next: display_next, display_prev: display_prev, email: req.cookies.email, login: req.cookies.login,});
                }
                else if (photos_number === 1) {
                    display_next = 'display:none';
                    display_prev = 'display:none';
                    res.render('category', {source: photo_path, photos_number: photos_number, category: category, photo: photo, photo_next: photo_next, photo_prev: photo_prev, display_next: display_next, display_prev: display_prev, email: req.cookies.email, login: req.cookies.login, hot: result.hot, not: result.not});
                }
                else if (parseInt(photo) === photos_number && photos_number > 1) {
                    display_next = 'display:none';
                    photo_prev = parseInt(photo) - 1;
                    res.render('category', {source: photo_path, photos_number: photos_number, category: category, photo: photo, photo_next: photo_next, photo_prev: photo_prev, display_next: display_next, display_prev: display_prev, email: req.cookies.email, login: req.cookies.login, hot: result.hot, not: result.not});
                }
                else if (parseInt(photo) === 1 && photos_number > 1) {
                    photo_next = parseInt(photo) + 1;
                    display_prev = 'display:none';
                    res.render('category', {source: photo_path, photos_number: photos_number, category: category, photo: photo, photo_next: photo_next, photo_prev: photo_prev, display_next: display_next, display_prev: display_prev, email: req.cookies.email, login: req.cookies.login, hot: result.hot, not: result.not});
                }
                else {
                    photo_next = parseInt(photo) + 1;
                    photo_prev = parseInt(photo) - 1;
                    res.render('category', {source: photo_path, photos_number: photos_number, category: category, photo: photo, photo_next: photo_next, photo_prev: photo_prev, display_next: display_next, display_prev: display_prev, email: req.cookies.email, login: req.cookies.login, hot: result.hot, not: result.not});
                }
            });     
        }
        else {
            console.log('Request to /categories');
            res.render('categories', {email: req.cookies.email, login: req.cookies.login});
        }
    });

    app.post('/categories', (req, res) => {
        console.log('POST Request to /categories');
        res.cookie('login', 'true',);
        res.cookie('email', req.body.email);

        users.findOne({email: req.body.email}, (err, result) => {
            if (err) {console.log(err);}
            if (!result) {
                users.insertOne({email: req.body.email}, (err, result) => {
                    if (err) {console.log(err);}
                    console.log(result);
                });
            }
        });
        res.redirect('/categories');
    });

    app.get('/hot', (req, res) => {
        console.log('Click HOT');
        let hot = 0;

        photos.findOne({photo_number: parseInt(req.query.photo)}, (err, result) => {
            if (err) {console.log(err);}
            if (result) {
                hot = result.hot + 1;
            }
            
            photos.updateOne({photo_number: parseInt(req.query.photo)}, {$set: {hot: hot}}, (err, resu) => {
                if (err) {console.log(err);}
                console.log(result.hot);
            });
        });

        res.redirect('/categories?category='+ req.query.category  +'&photo='+ req.query.photo);
    });

    app.get('/not', (req, res) => {
        console.log('Click NOT');
        let not = 0;

        photos.findOne({photo_number: parseInt(req.query.photo)}, (err, result) => {
            if (err) {console.log(err);}
            if (result) {
                not = result.not + 1;
            }
            
            photos.updateOne({photo_number: parseInt(req.query.photo)}, {$set: {not: not}}, (err, resu) => {
                if (err) {console.log(err);}
                console.log(result.not);
            });
        });

        res.redirect('/categories?category='+ req.query.category  +'&photo='+ req.query.photo);
    });

    app.get('/create', (req, res) => {
        res.render('create', {login: req.cookies.login, email: req.cookies.email});
    });

    app.post('/create', (req, res) => {
        if (!req.files) {console.log('Cant Upload File');}
        let photos_number = fs.readdirSync('./static/photos/' + req.body.category).length;
        let photo = photos_number + 1;
        req.files.fileupload.mv('./static/photos/' + req.body.category + '/photo' + photo + '.jpg', (err) => {
            if (err) {console.log(err);}
        });
        photos.insertOne({creator: req.cookies.email, category: req.body.category, hot: 0, not: 0, photo_number: photo}, (err, result) => {
            if (err) {console.log(err);}
            console.log(result);
        });
    });

    app.get('/logout', (req, res) => {
        res.cookie('login', 'false');
        res.cookie('email', '');
        res.redirect('/');
    });
});


//Listen on port 8000
app.listen(8000, (err) => {
    if (err) {console.log('Something went wrong.')}
    else {console.log('Listening on port 8000.');}
});