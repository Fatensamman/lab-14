'use strict';

//libraries
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');


///// app setup //////
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3030;
// to access static file
app.use(express.static('./public'));
// to add data to body using middlewhere
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'))

// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, });



///// routes//////
//home route
app.get('/', homeHandeler);
//searches/new route
app.get('/searches/new', navHandeler);
//searches route
app.post('/searches', showHandeler);
//get one book route
app.get('/book/:bookid', idhandeler);
//addbook to bookshelf
app.post('/books', bookshelfHandeler);
//error route

// update book details route
app.get('/book/update/:bookid', (req, res) => {
    let SQL = `SELECT * FROM books WHERE id = $1;`;
    let safe = [req.params.bookid]
    client.query(SQL, safe)
        .then(result => {
            res.render('pages/books/edit', { book: result.rows[0] });
        })
        .catch(error => {
            console.log('error', error.message);
        });
});
app.put('/book/:id', (req, res) => {
    let { image, title, author, description } = req.body;
    let SQL = `UPDATE books SET image=$1, title=$2, author=$3, description=$4 WHERE id =$5 RETURNING id;`;
    let safeValues = [image, title, author, description, req.params.id];

    client.query(SQL, safeValues)
        .then((result) => {
            res.redirect(`/book/${result.rows[0].id}`);
        })
        .catch((error) => {
            console.log('Error: ', error.message);
        });

})
// delete 
app.delete('/book/:id', (req, res) => {
    let SQL = `DELETE FROM books WHERE id =$1;`;
    let value = [req.params.id];
    client.query(SQL, value)
        .then((result) => {
            res.redirect(`/`);
        })
        .catch((error) => {
            console.log('Error: ', error.message);
        });
})


////// functions ////// 
// home function
function homeHandeler(req, res) {
    let SQL = `SELECT * FROM books;`;
    client.query(SQL).then(result => {
        res.render('./pages/index', { booksList: result.rows });
    })
        .catch((error => {
            console.log(`error in home`, error);
        }));
};

//searches/new function
function navHandeler(req, res) {
    res.render('pages/searches/new')
};

//searches function
function showHandeler(req, res) {
    let sort = req.body.sort;
    let search = req.body.search;
    let url = `https://www.googleapis.com/books/v1/volumes?q=${search}+in${sort}`;
    //    https://www.googleapis.com/books/v1/volumes?q=${search}+in${sort}

    superagent.get(url)
        .then(results => {
            let data = results.body.items;
            // res.send(results.body.items);
            let book = data.map(item => {
                // console.log(new Book(item))
                return new Book(item);

            })

            res.render('pages/searches/show', { bookLists: book });
        });
};

//get one book route
function idhandeler(req, res) {
    let SQL = `SELECT * FROM books WHERE id = $1;`;
    // console.log(req.params.bookid)
    let safe = [req.params.bookid]
    client.query(SQL, safe).then(result => {
        res.render('pages/books/details', { book: result.rows[0] });
    })
        .catch(error => {
            console.log('error', error.message);
        });
};


//addbook to bookshelf
function bookshelfHandeler(req, res) {
    let { image, title, author, description } = req.body;
    let SQL = `INSERT INTO books (image, title, author, description) VALUES($1, $2, $3, $4) RETURNING id;`;
    let safeValues = [image, title, author, description];
    let SQL2 = `SELECT * FROM books WHERE title=$1;`;
    let value = [title];

    client.query(SQL2, value)
        .then((results) => {
            // console.log(results.rows[0])
            if (results.rows[0]) {
                res.redirect(`/book/${results.rows[0].id}`);
            } else {
                client
                    .query(SQL, safeValues)
                    .then((results) => {
                        res.redirect(`/book/${results.rows[0].id}`);
                    })
                    .catch((error) => {
                        console.log('Error: ', error);
                    });
            }
        })
        .catch(errorHandeler);
};

//error function
function errorHandeler(req, res) {
    res.render('pages/error');
};


////// constructors //////
function Book(data) {
    this.image = data.volumeInfo.imageLinks.thumbnail ? data.volumeInfo.imageLinks.thumbnail : 'https://i.imgur.com/J5LVHEL.jpg';
    this.title = data.volumeInfo.title ? data.volumeInfo.title : 'No Title';
    this.description = data.volumeInfo.description ? data.volumeInfo.description : 'No description for This Book';
    this.author = data.volumeInfo.authors ? data.volumeInfo.authors.join(" ") : "Author is Unknown";
    // this.isbin = data.volumeInfo.industryIdentifiers[0].identifier ? data.volumeInfo.industryIdentifiers[0].identifier : 'No isbin '
}
app.use(errorHandeler);
////// listin //////
client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`http://localhost:${PORT}`)
        });
    });
