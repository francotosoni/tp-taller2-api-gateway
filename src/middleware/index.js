const admin = require("../config/firebase-config");

class Middleware {
  async decodeToken(req, res, next) {
		if (req.body && req.body.CronAuthToken && req.body.CronAuthToken == process.env.CRON_AUTH_TOKEN) {
			return next()
		}

    const token = req?.headers?.authorization?.split(" ")[1];

    try {
      const decodeValue = await admin.auth().verifyIdToken(token);

      if (decodeValue) {
        req.user = decodeValue.uid;
				req.provider = decodeValue.firebase.sign_in_provider
        return next();
      }
    } catch (e) {
      return res.sendStatus(403);
    }
		return res.sendStatus(403)
  }
}

module.exports = new Middleware();
