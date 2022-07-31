const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized User' });
    }
    else {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
            if (err) {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
            else {
                req.decoded = decoded;
                next();
            }
        });
    }
};


const uri = `mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_PASSWORD}@cluster0.jtqn4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        client.connect();
        const userCollection = client.db('quiz-app').collection('users');
        const quizCollection = client.db('quiz-app').collection('quizzes');

        // to insert a new user and update the previous user into database and give the user an access token 
        app.put('/user', async (req, res) => {
            const { email, name } = req.query;
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    email,
                    name
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token });
        });

        app.put('/user-score', async (req, res) => {
            const { email, score } = req.query;
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    score
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        app.get('/user/:email', async (req, res) => {
            const { email } = req.params;
            const user = await userCollection.findOne({ email: email });
            res.send(user);
        });

        app.get('/user', async (req, res) => {
            const users = (await userCollection.find().toArray()).reverse();
            res.send(users);
        })

        app.get('/quiz/:serial', verifyJWT, async (req, res) => {
            const serial = req.params.serial;
            const quiz = await quizCollection.findOne({ quizSerial: parseInt(serial) });
            res.send(quiz);
        });

    }
    finally { }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Quiz App Started');
});

app.listen(port, () => console.log('Listening to port:', port));