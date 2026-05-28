import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TasksScreen from '../screens/TasksScreen';
import HarvestScreen from '../screens/HarvestScreen';
import RequestScreen from '../screens/RequestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BottomNav from '../components/BottomNav';
import {type StaffProfile} from '../auth/session';

const Tab = createBottomTabNavigator();

export default function MainTabs({
  onLogout,
  staffProfile,
}: {
  onLogout: () => void;
  staffProfile: StaffProfile | null;
}) {
  return (
    <Tab.Navigator screenOptions={{headerShown: false}} tabBar={(props) => <BottomNav {...props} />}>
      <Tab.Screen name="Home">{() => <HomeScreen staffProfile={staffProfile} />}</Tab.Screen>
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Lands" component={HarvestScreen} />
      <Tab.Screen name="Team" component={RequestScreen} />
      <Tab.Screen name="Profile">{() => <ProfileScreen onLogout={onLogout} />}</Tab.Screen>
    </Tab.Navigator>
  );
}
