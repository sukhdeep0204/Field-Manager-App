import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TasksScreen from '../screens/TasksScreen';
import HarvestScreen from '../screens/HarvestScreen';
import RequestScreen from '../screens/RequestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BottomNav from '../components/BottomNav';

const Tab = createBottomTabNavigator();

export default function MainTabs({onLogout}: {onLogout: () => void}) {
  return (
    <Tab.Navigator screenOptions={{headerShown: false}} tabBar={(props) => <BottomNav {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Lands" component={HarvestScreen} />
      <Tab.Screen name="Team" component={RequestScreen} />
      <Tab.Screen name="Profile">{() => <ProfileScreen onLogout={onLogout} />}</Tab.Screen>
    </Tab.Navigator>
  );
}
