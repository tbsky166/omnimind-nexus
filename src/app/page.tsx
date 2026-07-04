import PixelGrid from "@/components/PixelGrid";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import PixelDivider from "@/components/PixelDivider";
import ProtocolLayers from "@/components/ProtocolLayers";
import AgentConversation from "@/components/AgentConversation";
import AgentNetwork from "@/components/AgentNetwork";
import CreatorSpotlight from "@/components/CreatorSpotlight";
import Stats from "@/components/Stats";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <PixelGrid />
      <Nav />
      <Hero />
      <PixelDivider />
      <Stats />
      <PixelDivider />
      <ProtocolLayers />
      <PixelDivider />
      <AgentConversation />
      <PixelDivider />
      <AgentNetwork />
      <PixelDivider />
      <CreatorSpotlight />
      <PixelDivider />
      <FinalCTA />
      <Footer />
    </main>
  );
}