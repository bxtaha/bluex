import { stores as Store } from '../../../../models';

export default async (req, res) => {
  switch (req.method) {
    case 'PUT':
      await handlePutRequest(req, res);
      break;
    default:
      res.status(405).send(`Method ${req.method} not allowed`);
      break;
  }
};

const handlePutRequest = async (req, res) => {
  const { id, status } = req.body;

  try {
    await Store.update(
      { status: status },
      {
        where: {
          id: id,
        },
      }
    );
    res.status(200).send('status updated');
  } catch (error) {
    res.status(500).send('Error in updating stores, please try again!');
  }
};
