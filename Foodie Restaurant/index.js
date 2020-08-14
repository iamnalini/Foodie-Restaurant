var express = require('express');
var bodyParser = require('body-parser');
const {Client} = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { response } = require('express');
const ejs = require('ejs');
var app = express();
app.use(cors());

const SECRET_KEY = "secretkey23456";

app.set('view engine', 'ejs');

const connectionString = 'postgressql://postgres:nalini@localhost:5432/restaurant';

const client = new Client({
    connectionString: connectionString
});

client.connect();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

var userid;

app.get('/home',(req,res) => {
    res.render('home',{invalid:true});
})

app.get('/admin',(req,res) => {
    res.render('admin_login',{invalid:true});
})

app.get('/register',(req,res) => {
    res.render('register',{invalid:true});
})

app.get('/create',(req,res) => {
    res.render('create',{invalid:true});
})

app.post('/login', (req,response) => {
    client.query(`SELECT * FROM login where username=$1 and password=$2`,[req.body.username,req.body.password],(err,res) => {
        if(res.rowCount == 1){
            const expiresIn = 24 * 60 * 60;
            var i,row;
            row = res.rows[0];
            userid = row.id;
            const accessToken = jwt.sign({ id: row.id }, SECRET_KEY, {
                expiresIn: expiresIn
            });
            response.redirect('/readuser')
        }
        else{
            response.render('home',{invalid:false})
        }
    });
});

app.post('/admin_login', (req,response) => {
    client.query(`SELECT * FROM admin_login where username=$1 and password=$2`,[req.body.username,req.body.password],(err,res) => {
       if(res.rowCount == 1){
           const expiresIn = 24 * 60 * 60;
           var i,row;
           row = res.rows[0];
           userid = row.id;
           const accessToken = jwt.sign({ id: row.id }, SECRET_KEY, {
               expiresIn: expiresIn
           });
           response.redirect('/readcust')
       }
       else{
           response.render('admin_login',{invalid:false})
       }
   });
});

app.post('/register', (req, response) => {
    const  username  =  req.body.username;
    const  email  =  req.body.email;
    const  pwd  =  req.body.password;
    const  phno  =  req.body.phno;

    client.query(`SELECT email FROM login where email=$1`,[email],(error,resp) => {
        if(error){
            console.log(error)
        }
        else{
            if(resp.rowCount!=0){
                response.render('register',{invalid:false});
            }
            else {
                client.query(`SELECT id FROM login order by id desc limit 1`,(err,res) => {
                    if(err) console.log(err)
                    var id;
                    if(res.rowCount==0)
                        id = 1;
                    else
                        id = res.rows[0].id+1;
                    client.query(`INSERT INTO login (id,username,password,email,phno) values ($1,$2,$3,$4,$5)`,[id,username,pwd,email,phno],(err,res) => {
                        if(err) console.log(err)
                        client.query(`SELECT * FROM login where username=$1`,[username],(err,res) => {
                            if (err) console.log(err)
                            else
                            {
                                const expiresIn = 24 * 60 * 60;
                                const accessToken = jwt.sign({ id: res.rows.id }, SECRET_KEY, {
                                    expiresIn: expiresIn
                                });
                                response.render('home',{invalid:true});
                            }
                        });
                    });
                });
            }
        }
    })
});

app.post('/create',(req,response) => {
    client.query(`SELECT orderid FROM reserve order by orderid desc limit 1`,(err,res) => {
        if(err)
            console.log(err);
        if(res.rowCount==0)
            orderid = 1;
        else
            orderid = res.rows[0].orderid;
        orderid=orderid+1;
        client.query(`INSERT INTO reserve (userid,orderid,name,tableno,purpose,meal,time,date,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[userid,orderid,req.body.name,req.body.tableno,req.body.purpose,req.body.meal,req.body.time,req.body.date,'NOT CONFIRM'],(err,resp) => {
            if(err)
                console.log(err);
            response.redirect('/readuser');
        });
    });
   
});

app.post('/edit',(req,response) => {
    var data = req.body;
    response.render('edit',{data:data});
})

app.post('/edit_data',(req,response) => {
    console.log(req.body);
    client.query(`DELETE FROM reserve where userid=${userid} and orderid=${req.body.orderid}`,(err,res) => {
        if(err)
            console.log(err);
        client.query(`INSERT INTO reserve (userid,orderid,name,tableno,purpose,meal,time,date,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[userid,req.body.orderid,req.body.name,req.body.tableno,req.body.purpose,req.body.meal,req.body.time,req.body.date,'NOT CONFIRM'],(err,resp) => {
            if(err)
                console.log(err);
            response.redirect('/readuser');
        }); 
    });
})

app.post('/delete',(req,response) => {
    client.query(`DELETE FROM reserve where userid=${req.body.userid} and orderid=${req.body.orderid}`,(err,res) => {
        if(err)
            console.log(err);
        response.redirect('/readuser');
    });
});

app.get('/readuser',(req,response) => {
    client.query(`SELECT * FROM reserve where userid=${userid} and date>=CURRENT_DATE`,(err,res) => {
        if(err)
            console.log(err);
        var data = res.rows;
        response.render('userread',{data:data});
    });
});

app.get('/readcust',(req,response) => {
    client.query(`SELECT * FROM reserve where date>=CURRENT_DATE`,(err,res) => {
        if(err)
            console.log(err);
        var data = res.rows;
        response.render('cust_read',{data:data});
    });
});

app.post('/accept',(req,response) => {
    console.log(req.body);
    client.query(`UPDATE reserve SET status='CONFIRMED' where userid=${req.body.userid} and orderid=${req.body.orderid}`,(err,res) => {
        if(err)
            console.log(err);
        response.redirect('/readcust');
    });
});

app.post('/reject',(req,response) => {
    console.log(req.body);
    client.query(`UPDATE reserve SET status='REJECTED' where userid=${req.body.userid} and orderid=${req.body.orderid}`,(err,res) => {
        if(err)
            console.log(err);
        response.redirect('/readcust');
    });
});

app.listen('8888',() => {
    console.log('Server started on port 8888...');
});
