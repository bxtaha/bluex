import { Modal, Button } from "react-bootstrap";
import axios from "axios";
import baseUrl from "../../utils/baseUrl";
import { parseCookies } from "nookies";

const ProductDeleteModal = ({
	show,
	productId,
	handleClose,
	productName,
	setProductList,
}) => {
	const { livani_token } = parseCookies();

	const handleDelete = async () => {
		const payload = {
			headers: { Authorization: livani_token },
		};

		const url = `${baseUrl}/api/v1/products/${productId}`;
		const response = await axios.delete(url, payload);
		setProductList(response.data);

		handleClose();
	};

	return (
		<>
			<Modal show={show} onHide={handleClose}>
				<Modal.Header closeButton>
					<Modal.Title>{productName}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					Do you reall want to delete this product?
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={handleClose}>
						Close
					</Button>
					<Button variant="danger" onClick={handleDelete}>
						Delete
					</Button>
				</Modal.Footer>
			</Modal>
		</>
	);
};

export default ProductDeleteModal;
