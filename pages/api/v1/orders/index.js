import { orders as Order } from '../../../../models';
import { orderitems as OrderItem } from '../../../../models';

export default async (req, res) => {
  switch (req.method) {
    case 'GET':
      await getOrders(req, res);
      break;

    default:
      res.status(405).send(`Method ${req.method} not allowed`);
      break;
  }
};

const getOrders = async (req, res) => {
  const { page, limit } = req.query;
  try {

    //pagination
    const pageNumber = parseInt(page);
    const getRealNumber = isNaN(pageNumber) ? 0 : pageNumber;
    const postsOffset = limit * (getRealNumber - 1);

    const totalOrders = await Order.count({});

    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']],
      offset: postsOffset,
      limit,

      include: [
        {
          model: OrderItem,
          as: 'ordersItem',
        },
      ],
    });

    const totalPages = Math.ceil(totalOrders / limit);

    return res.status(200).json({ orders, totalPages });
  } catch (error) {
    res.status(500).send('Error');
  }
};
