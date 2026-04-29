import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getToken, getUser } from "@/lib/api";

// Pages
import Login from "@/pages/login";
import RegisterDonor from "@/pages/register-donor";
import RegisterHospital from "@/pages/register-hospital";
import NotFound from "@/pages/not-found";

// Hospital
import HospitalLayout from "@/components/hospital-layout";
import HospitalDashboard from "@/pages/hospital/dashboard";
import HospitalMap from "@/pages/hospital/map";
import HospitalVerify from "@/pages/hospital/verify";
import HospitalReports from "@/pages/hospital/reports";

// Donor
import DonorLayout from "@/components/donor-layout";
import DonorDashboard from "@/pages/donor/dashboard";
import DonorToken from "@/pages/donor/token";
import DonorLeaderboard from "@/pages/donor/leaderboard";

const queryClient = new QueryClient();

// Auth guards
const ProtectedRoute = ({ component: Component, role, layout: Layout, ...rest }: any) => {
  const token = getToken();
  const user = getUser();
  
  if (!token || !user) {
    return <Redirect to="/login" />;
  }
  
  if (role && user.role !== role) {
    return <Redirect to={`/${user.role}/dashboard`} />;
  }
  
  const Page = () => (Layout ? <Layout><Component {...rest} /></Layout> : <Component {...rest} />);
  return <Page />;
};

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => {
          const token = getToken();
          const user = getUser();
          if (token && user) return <Redirect to={`/${user.role}/dashboard`} />;
          return <Redirect to="/login" />;
        }}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/register/donor" component={RegisterDonor} />
      <Route path="/register/hospital" component={RegisterHospital} />

      {/* Hospital Routes */}
      <Route path="/hospital/dashboard">
        {() => <ProtectedRoute component={HospitalDashboard} role="hospital" layout={HospitalLayout} />}
      </Route>
      <Route path="/hospital/map">
        {() => <ProtectedRoute component={HospitalMap} role="hospital" layout={HospitalLayout} />}
      </Route>
      <Route path="/hospital/verify">
        {() => <ProtectedRoute component={HospitalVerify} role="hospital" layout={HospitalLayout} />}
      </Route>
      <Route path="/hospital/reports">
        {() => <ProtectedRoute component={HospitalReports} role="hospital" layout={HospitalLayout} />}
      </Route>

      {/* Donor Routes */}
      <Route path="/donor/dashboard">
        {() => <ProtectedRoute component={DonorDashboard} role="donor" layout={DonorLayout} />}
      </Route>
      <Route path="/donor/token">
        {() => <ProtectedRoute component={DonorToken} role="donor" layout={DonorLayout} />}
      </Route>
      <Route path="/donor/leaderboard">
        {() => <ProtectedRoute component={DonorLeaderboard} role="donor" layout={DonorLayout} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
