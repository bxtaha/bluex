import TopNavbar from '../../components/Admin/TopNavbar';
import StoreSidebar from '../../components/_App/StoreSidebar';
import StoreDashboardArea from '../../components/Store/StoreDashboardArea';


const Orders = ({ user,store }) => {
  return (
    <>
      <TopNavbar user={user} store={store}/>
      <StoreSidebar user={user}/>
      <StoreDashboardArea store={store}/>
    </>
  );
};

export default Orders;