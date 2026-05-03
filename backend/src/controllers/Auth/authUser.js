import userModel from '../../models/User.js'

// @desc  
// @route  get /auth/authUser
export const authUser = async (req, res, next) => 
{
    try 
    {
        if (!req.session?.userId) 
        {
            console.log("Not authenticated")

            const error = new Error("Not authenticated");
            error.status = 401;
            return next(error);
        }

        // Fetch user info from DB using the session's userId, including password for state check
        const user = await userModel.findById(req.session.userId).select("+password");

        if (!user) 
        {
            console.log("User not found")

            const error = new Error("User not found");
            error.status = 404;
            return next(error);
        }

        console.log("authenticated")
        return res.json({ user: user }); // toJSON transform handles cleanup and hasPassword
    } 
    catch (err) 
    {
        console.error(err);
        const error = new Error("Server error");
        next(error);
    }
}