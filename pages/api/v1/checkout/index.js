import { orders as Order } from '../../../../models';
import { orderitems as OrderItem } from '../../../../models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
const stripe = require('stripe')('sk_test_u704p2U4oM3G2rft3xenXD4a00Q5QCnuHm');

export default async (req, res) => {
  switch (req.method) {
    case 'POST':
      await handleStripeRequest(req, res);
      break;

    default:
      res.status(405).send(`Method ${req.method} not allowed`);
      break;
  }
};

const handleStripeRequest = async (req, res) => {
  try {
    const { paymentData, productDetails } = req.body;
    const {
      orderItems,
      country,
      name,
      address,
      email,
      city,
      phone,
      totalPrice,
      storeId,
    } = productDetails;

    const { userId } = jwt.verify(
      req.headers.authorization,
      process.env.JWT_SECRET
    );


    const prevCustomer = await stripe.customers.list({
      email: paymentData.email,
      limit: 1,
    });

    const isExistingCustomer = prevCustomer.data.length > 0;

    let newCustomer;
    if (!isExistingCustomer) {
      newCustomer = await stripe.customers.create({
        email: paymentData.email,
        source: paymentData.id,
      });
    }
    const customer =
      (isExistingCustomer && prevCustomer.data[0].id) || newCustomer.id;

    const charge = await stripe.charges.create(
      {
        currency: 'usd',
        amount: totalPrice,
        receipt_email: paymentData.email,
        customer,
        description: `Checkout | ${paymentData.email} | ${paymentData.id}`,
      },
      {
        idempotencyKey: uuidv4(),
      }
    );

    const newOrder = new Order({
      userId,
      name,
      address,
      country,
      city,
      phone,
      email,
      totalPrice,
    });

    const { id } = await newOrder.save();

    await createOrderItems(orderItems, userId,storeId, id);
    res.send(charge);
  } catch (err) {
    res.send(err);
  }
};

const createOrderItems = async (orderItems, userId,storeId, id) => {
  const promiseItems = orderItems.map((order) =>
    new OrderItem({
      name: order.name,
      quantity: order.quantity,
      image: order.image,
      price: order.price,
      productId: order.id,
      storeId,
      userId,
      orderId: id,
    }).save()
  );

  await Promise.all(promiseItems);
};
