import { orders as Order } from '../../../../models';


export default async (req, res) => {

    switch (req.method){
        case "PUT":
            await updateOrderToDelivered(req, res)
            break

        default:
            res.status(405).send(`Method ${req.method} not allowed`)
            break
    }
}



const updateOrderToDelivered = async (req, res) => {
  try{
    const order = await Order.findByPk(req.query.id)
  
    if (order.isDelivered === false) {

        order.isDelivered = true
    
        await order.save()
        const updatedOrder = await Order.findAll({ order: [['createdAt', 'DESC']] });
        res.json(updatedOrder)
    }else if(order.isDelivered === true){

        order.isDelivered = false
    
        await order.save()
        const updatedOrder = await Order.findAll({ order: [['createdAt', 'DESC']] });
    
        res.json(updatedOrder)
    } else {

        res.status(404)

        throw new Error('Order not found')
    }
  }catch(error){
    res.status(500).send('Error');
  }

    
}