import TopHeader from '../components/Layouts/TopHeader'
import Navbar from '../components/Layouts/Navbar';
import Footer from '../components/Layouts/Footer';
import SaleRequestArea from '../components/SaleRequest/SaleRequestArea';

const SaleRequest = ({user,store}) => {
    return (
        <>
            <TopHeader user={user}/>
            <Navbar user={user} store={store}/>
            <SaleRequestArea/>
            <Footer/>
        </>
    )
}

export default SaleRequest
