const express = require("express");
const cors = require("cors");
const axios = require("axios");
const middleware = require("./middleware");
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 8080;

const { connect } = require('amqplib')

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost'

const queue = "metrics"
let channel;

const connectToQueue = async () => {
	console.log("intentando conectar a", RABBITMQ_URI)
	const connection = await connect(RABBITMQ_URI)
	channel = await connection.createChannel()
	await channel.assertQueue(queue, { durable: false })
}

connectToQueue()
.then(() => console.log("Connected to queue"))
.catch((e) => console.log("Error connecting to queue", e))

users_api = process.env.USERS_API || "https://usersmicroservice.onrender.com";
snaps_api = process.env.SNAPS_API || "https://snapsmicroservice.onrender.com";
metrics_api = process.env.METRICS_API || "https://metric-egfu.onrender.com";
notifications_api = process.env.NOTIFICATIONS_API || "";

app.use(cors());
app.use(express.json());
app.use(middleware.decodeToken);

app.post("/user", (req, res) => {
  user = req.body;

  axios
    .post(users_api + "/user", user)
    .then((response) => {
			if (req.provider == "google.com") {
				channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "sign-up-google"})))
			} else if (req.provider == "password") {
				channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "sign-up-password"})))
			}

			channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "country", data: user.country || "AR" })))
			res.send(response.data)
		})
    .catch((error) => res.status(error.response.status).send("error"));
});

app.get("/user", (req, res) => {
  let path = `${users_api}/user`;
  if (req.query.uid) {
    path += `?uid=${req.query.uid}`;
  } else if (req.query.username) {
    path += `?username=${req.query.username}`;
  } else {
    path += `?uid=${req.user}`;
  }

	if (!req.query.username || !req.query.uid || req.user == req.query.uid) {
			if (req.provider == "google.com") {
				channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "sign-in-google" })))
			} else if (req.provider == "password") {
				channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "sign-in-password" })))
			}
	}

  axios
    .get(path)
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.post("/user/block", (req, res) => {
  let path = `${users_api}/user/block`;
  path += `/${req.body.uid}`;

  admin.auth().updateUser(req.body.uid, {
    disabled: true
  });

channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "block" })))

  axios
    .post(path)
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));

});

app.post("/user/unblock", (req, res) => {
  let path = `${users_api}/user/unblock`;
  path += `/${req.body.uid}`;

  admin.auth().updateUser(req.body.uid, {
    disabled: false
  });

channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "unblock" })))
  axios
    .post(path)
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));

});

app.post("/snap/block", (req, res) => {
  let path = `${snaps_api}/snap/block`;
  path += `/${req.body.id}`;

  axios
    .post(path)
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));

});

app.post("/snap/unblock", (req, res) => {
  let path = `${snaps_api}/snap/unblock`;
  path += `/${req.body.id}`;

  axios
    .post(path)
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));

});

app.get('/users', (req, res) => {
	  let path = `${users_api}/users`

    axios.get(path)
        .then((response) => {
					res.send(response.data)
				})
        .catch((error) => res.status(error.response.status || 400).send("error"))
})

app.post("/user/follow/:followee_uid", async (req, res) => {
	let user
  try {
    user = await axios.get(users_api + `/user?uid=${req.user}`);
  } catch (e) {
    res.status(404).send("User not found");
  }

	let response;
	try {
		response = await axios
			.post(users_api + `/follow/${req.user}/${req.params.followee_uid}`)
	} catch (e) {
		res.sendStatus(400)
	}

	try {
		await axios.post(notifications_api + "/following/", {
			receiverUid: req.params.followee_uid,
			followerUsername: user.data.username
		})
	} catch {
	}

	res.sendStatus(response.status || 200);
});

app.post("/user/unfollow/:followee_uid", (req, res) => {
  axios
    .post(users_api + `/unfollow/${req.user}/${req.params.followee_uid}`)
    .then(function (response) {
      res.send(response.data);
    })
		.catch(() => res.sendStatus(404));
});


app.get("/recommendations", (req, res) => {
  axios
    .get(users_api + `/users/recommendations/${req.user}`)
    .then((response) => res.send(response.data))
		.catch(() => res.sendStatus(404));
});

app.put("/user/profile/", (req, res) => {
  new_user_values = req.body;
  axios
    .put(users_api + `/profile/${req.user}`, new_user_values)
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => res.status(error.response.status).send("error"));
});

app.get("/snap/:snap_id", (req, res) => {
  axios
    .get(snaps_api + `/${req.params.snap_id}`)
    .then((response) => res.send(response.data))
    .catch((error) => res.sendStatus(error.response.status || 400));
});

app.post("/snap/", async (req, res) => {
  let user;
  let user_id = req.user;
  try {
    user = await axios.get(users_api + `/user?uid=${user_id}`);  
  } catch (e) {
    res.status(404).send("User not found");
  }

  snap_new_data = req.body;
  snap_new_data.authorUsername = user.data.username;
  if (user.data.photoURL) {
    snap_new_data.authorPhotoURL = user.data.photoURL;
  }
	
  channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "snap" })))
  channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "hashtag", data: snap_new_data.hashtags })))
  axios
    .post(snaps_api + `/${user_id}`, snap_new_data)
    .then((response) => {
         
      res.status(200).send(response.data);
    })
    .catch((error) => res.sendStatus(error.response.status || 400));
});

app.put("/snap/:snap_id", (req, res) => {
  // ok
  snap_id = req.params.snap_id;
  snap_new_data = req.body;
  axios
    .put(snaps_api + `/${snap_id}`, snap_new_data)
    .then(function (response) {
      res.send(response.data);
    })
    .catch((error) => res.sendStatus(error.response.status || 400));
});

app.post('/resnap/', async (req, res) => { //ok
    let user_id = req.user
    snap_resnapped = req.body

    axios.post(snaps_api + `/resnap/${snap_resnapped.id}/${user_id}`)
        .then((response) => res.send(response.data))
				.catch((error) => res.sendStatus(error.response.status || 400));
});

app.get("/feed/", (req, res) => {
  let path = `${snaps_api}/feed/${req.user}`;
  if (req.query.offset) path += `?offset=${req.query.offset}`;
  axios
    .get(path)
    .then((response) => res.send(response.data))
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.put("/snap/like/:snapId", (req, res) => {
  axios
    .put(snaps_api + "/like/", {
      snapid: req.params.snapId,
      userUid: req.user,
    })
    .then((response) => res.send(response.data))
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.put("/snap/dislike/:snapId", (req, res) => {
  axios
    .put(snaps_api + "/dislike/", {
      snapid: req.params.snapId,
      userUid: req.user,
    })
    .then((response) => {
      res.send(response.data);
    })
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.delete("/snap/:snap_id", (req, res) => {
  snap_id = req.params.snap_id;
  axios
    .delete(snaps_api + `/${snap_id}`)
    .then((response) => res.send(response.data))
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.get("/snaps", (req, res) => {
  let path = `${snaps_api}/snaps?offset=${req.query.offset || 0}&limit=${req.query.limit || 0}`;
	if (req.query.user_uid) path += `&user_uid=${req.query.user_uid}`;
  if (req.query.trend) path += `&trend=${req.query.trend}`;

  axios
    .get(path)
    .then((response) => res.send(response.data))
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.get("/snaps/all", (req, res) => {
  let path = `${snaps_api}/snaps/all?offset=${req.query.offset || 0}&limit=${req.query.limit || 0}`;
	if (req.query.user_uid) path += `&user_uid=${req.query.user_uid}`;
  if (req.query.trend) path += `&trend=${req.query.trend}`;

  axios
    .get(path)
    .then((response) => res.send(response.data))
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.post("/notifications/notification-token", async (req, res) => {
  if (!req.body.pushToken) return res.sendStatus(400);

  axios
    .post(notifications_api + `/notification-token`, {
      pushToken: req.body.pushToken,
      uid: req.user,
    })
    .then((response) => res.send(response.data))
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.post("/notifications/message", async (req, res) => {
  if (!req.body.receiverUid || !req.body.message || !req.body.senderUsername)
    return res.sendStatus(400);

  axios
    .post(notifications_api + `/message`, req.body)
    .then(() => {
      res.sendStatus(200);
    })
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.post("/notifications/trends", async (req, res) => {
	let trends
	try {
		trends = await axios
			.get(snaps_api + "/trends")
	} catch (error) {
		return res.sendStatus(error?.response?.status || 400);
	}

	if (!trends.data || trends.data.length == 0) {
		return res.status(error?.response?.status || 400);
	}

	let trend_index = Math.floor(Math.random() * trends.data.length)
  axios
    .post(notifications_api + `/trends`, trends.data[trend_index])
    .then(() => {
      res.sendStatus(200);
    })
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.get("/notifications/", (req, res) => {
  axios
    .get(notifications_api + `/notifications/${req.user}`)
    .then((response) => {
      res.send(response.data);
    })
		.catch((error) => res.sendStatus(error.response.status || 400));
});

app.get("/search/:input_query", async (req, res) => {
	let snaps
	let users

	try {
		snaps = await axios.get(snaps_api + `/search/${req.params.input_query}`);
		users = await axios.get(users_api + `/search/${req.params.input_query}`);
	} catch {
		res.sendStatus(400)
	}

  response = { snaps: snaps.data, users: users.data };
  res.send(response);
});

app.get("/stats", (req, res) => {
  let path = `${snaps_api}/stats?user_id=${req.user}`;
  if (req.query.days) path += `&days=${req.query.days}`;
  axios
    .get(path)
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.post("/trends", (req, res) => {
  axios
    .post(snaps_api + "/trends")
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get("/trends", (req, res) => {
  axios
    .get(snaps_api + "/trends")
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.post('/sms', (req, res) => {
	console.log("PHONE NUMBRE", req.body.phone_number)
  axios
    .get(users_api + `/sms/${req.user}/${req.body.phone_number}`)
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.post('/verify', (req, res) => {
  axios
    .get(users_api + `/verify/${req.user}/${req.body.verification_code}`)
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/metrics/sign-up-password', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/sign-up-password")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/metrics/sign-up-google', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/sign-up-google")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/metrics/sign-in-google', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/sign-in-google")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/metrics/sign-in-password', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/sign-in-password")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});


app.get('/metrics/block', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/block")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/metrics/change-password', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/change-password")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.post('/metric/change-password', async (req, res) => {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ type: "change-password" })))
});

app.get('/metrics/country', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/country")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/metric/health', async (req, res) => {
    axios
    .get(metrics_api + "/health")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/metrics/snap', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/snap")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/metrics/hashtag', async (req, res) => {
    axios
    .get(metrics_api + "/metrics/hashtag")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/user/health', async (req, res) => {
    axios
    .get(users_api + "/health")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/snap/health', async (req, res) => {
    axios
    .get(snaps_api + "/")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.get('/notification/health', async (req, res) => {
    axios
    .get(notifications_api + "/health")   
    .then((response) => res.send(response.data))
    .catch((error) => res.status(error.response.status || 400).send("error"));
});

app.listen(port, () => {
	console.log(`server is running on port ${port}`);
});
