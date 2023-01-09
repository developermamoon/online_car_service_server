const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dqmis3n.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT (req, res, next){
    const AuthHeader = req.headers.authorization;

    if(!AuthHeader){
        res.status(401).send({message: 'UnAuthorized Access'})
    }
    const token = AuthHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
        if(err){
           return res.status(401).send({message: 'UnAuthorized Access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){

    try{
        const serviceCollection = client.db('geniusCar').collection('services');
        const orderCollection = client.db('geniusCar').collection('orders');


        app.post('/jwt', (req, res)=>{
            
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
            res.send({token});
            // console.log(user);
        })
   
        //getting all the data from database to server
        app.get('/services', async(req, res)=>{
            const query = {};
            const cursor = serviceCollection.find(query); 
            const services = await cursor.toArray();
            res.send(services);

        })

        //getting a specific data using id from database in CRUD
        app.get('/services/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const service = await serviceCollection.findOne(query);
            res.send(service)
        })


        //orders API

        //getting certain client orders from database
        app.get('/orders', verifyJWT, async(req, res)=>{
            const decoded = req.decoded;
            console.log("Inside order api", decoded);

            if(decoded.email !== req.query.email){
                res.status(403).send({message: 'UnAuthorized Access'})
            }

            let query = {};
            if(req.query.email){
                query = {
                    email: req.query.email
                }
            }
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })

        //getting the order from the client and save to database
        app.post('/orders', async(req,res)=>{
            const order = req.body;
            console.log(order);
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        //delete from the database
        app.delete('/orders/:id', async(req,res)=>{
            const id = req.params.id;
            const query = { _id: ObjectId(id)}
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        //update into database 
        app.patch('/orders/:id', async(req, res)=>{
            const id  = req.params.id;
            const status = req.body.status;
            const query = { _id: ObjectId(id)}

            const updatedDoc = {
                $set: {
                    status: status,
                }
            }
            const result = await orderCollection.updateOne(query, updatedDoc);
            res.send(result);

        })



    }
    finally{}
}

run().catch(err=>console.log(err))



app.get('/', (req, res)=>{
    res.send("Genius car server is running")
})

app.listen(port, ()=>{
    console.log(`Server running on port: ${port}`)
})