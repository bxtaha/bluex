import React, { useState } from "react";
import Gravatar from "react-gravatar";
import formatDate from "../../utils/formatDate";
import { useRouter } from "next/router";

import axios from "axios";
import baseUrl from "../../utils/baseUrl";

const UserWithPermission = ({ users, totalPages, user }) => {
	const router = useRouter();

	const updatePermission = async (id, role) => {
		// console.log(role);
		const url = `${baseUrl}/api/v1/auth/account`;
		const payload = { id: id, role: role === "user" ? "admin" : "user" };
		await axios.put(url, payload);
		router.push("/admin/users");
	};

	return (
		<>
			<div className="admin-table height-555">
				<div className="table-responsive">
					<table className="table table-hover mb-0">
						<thead>
							<tr>
								<th>Switch</th>
								<th>Name</th>
								<th>Image</th>
								<th>Email</th>
								<th>Joined</th>
								<th>Updated</th>
								<th>Role</th>
							</tr>
						</thead>
						<tbody>
							{users &&
								users.map((user) => (
									<tr key={user.id}>
										<td>
											<label className="switch">
												<input
													type="checkbox"
													id={user.id}
													checked={
														user.role === "admin"
															? true
															: false
													}
													onChange={() =>
														updatePermission(
															user.id,
															user.role
														)
													}
												/>
												<span className="slider round"></span>
											</label>
										</td>
										<td>
											<strong>{user.name}</strong>
										</td>
										<td>
											<Gravatar
												email={user.email}
												size={50}
												rating="pg"
												default="monsterid"
											/>
										</td>
										<td>{user.email}</td>
										<td>{formatDate(user.createdAt)}</td>
										<td>{formatDate(user.updatedAt)}</td>
										<td>{user.role}</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
};

export default UserWithPermission;
