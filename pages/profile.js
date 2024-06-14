import React from "react";
import Gravatar from "react-gravatar";
import formatDate from "../utils/formatDate";
import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";

const Profile = ({ user, store }) => {
	return (
		<>
			<TopHeader user={user} />
			<Navbar user={user} store={store} />
			<div className="profile-area">
				<div className="container">
					<div className="profile-root-user">
						<div className="profile-image">
							{/* Image recommended size 200x200  */}
							{/* <img src="images/profile.jpg" /> */}
							<Gravatar
								email={user.email}
								size={100}
								rating="pg"
								default="monsterid"
							/>
							{/* <img src="images/default-profile.jpg" /> */}
						</div>

						<h3>{user.name}</h3>
						<p>{user.email}</p>
						<p>Joined: {formatDate(user.createdAt)}</p>
						<p>
							Role:{" "}
							{user.role === "user" ? "Customer" : user.role}
						</p>
					</div>
				</div>
			</div>
		</>
	);
};

export default Profile;
