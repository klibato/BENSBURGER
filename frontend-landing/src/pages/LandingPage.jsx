import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Shield,
  Zap,
  Users,
  TrendingUp,
  Lock,
  CheckCircle,
  ArrowRight,
  Globe,
  Database,
  Award
} from 'lucide-react';

function LandingPage() {
  const navigate = useNavigate();
  const goToLogin = () => window.location.href = 'https://app.flexpos.app/login';
  const goToSignup = () => navigate('/signup');

  const features = [
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: 'Point de Vente Moderne',
      description: 'Interface intuitive et rapide pour gérer vos ventes en temps réel',
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Conformité NF525',
      description: 'Certification fiscale française intégrée avec hash cryptographique SHA-256',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Multi-Tenant',
      description: 'Isolation parfaite des données entre organisations',
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Temps Réel',
      description: 'Synchronisation instantanée sur tous vos appareils',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Tableaux de Bord',
      description: 'Analytics et rapports détaillés pour piloter votre activité',
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: 'Sécurité Maximale',
      description: 'Authentification JWT, audit logs, permissions granulaires',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '29€',
      period: '/mois',
      features: [
        '1 organisation',
        '5 utilisateurs',
        'Support email',
        'Conformité NF525',
        'Mises à jour incluses',
      ],
      cta: 'Commencer',
      highlighted: false,
    },
    {
      name: 'Business',
      price: '79€',
      period: '/mois',
      features: [
        '1 organisation',
        'Utilisateurs illimités',
        'Support prioritaire 24/7',
        'Conformité NF525',
        'API accès complet',
        'Rapports avancés',
      ],
      cta: 'Essayer gratuitement',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Sur mesure',
      period: '',
      features: [
        'Organisations multiples',
        'Utilisateurs illimités',
        'Support dédié',
        'SLA garanti',
        'Déploiement on-premise',
        'Intégrations custom',
      ],
      cta: 'Nous contacter',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header/Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FlexPOS
              </span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition">
                Fonctionnalités
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition">
                Tarifs
              </a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition">
                À propos
              </a>
            </nav>
            <button
              onClick={goToLogin}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
            >
              Connexion
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-70"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              Le POS Moderne
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Conforme NF525
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Gérez votre restaurant avec une solution cloud multi-tenant, sécurisée et certifiée fiscalement
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={goToSignup}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl text-lg font-semibold flex items-center justify-center gap-2"
              >
                Démarrer gratuitement
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition shadow-lg hover:shadow-xl text-lg font-semibold border-2 border-gray-200"
              >
                Découvrir
              </button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">100%</div>
                <div className="text-gray-600 mt-2">Conformité NF525</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">24/7</div>
                <div className="text-gray-600 mt-2">Support disponible</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-pink-600">∞</div>
                <div className="text-gray-600 mt-2">Évolutivité</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">
                  <Shield className="w-10 h-10 inline" />
                </div>
                <div className="text-gray-600 mt-2">Sécurité maximale</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              FlexPOS combine puissance, simplicité et conformité réglementaire
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NF525 Compliance Highlight */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-12 h-12" />
                <h2 className="text-4xl font-bold">Conformité NF525</h2>
              </div>
              <p className="text-xl mb-6 text-blue-100">
                Certification fiscale française intégrée nativement
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">
                    Hash cryptographique SHA-256 inaltérable
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">
                    Triggers PostgreSQL pour garantir l'immutabilité
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">
                    Exports conformes décret n°2016-1551
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">
                    Vérification d'intégrité en temps réel
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
              <Database className="w-16 h-16 mb-4" />
              <h3 className="text-2xl font-bold mb-4">Architecture Multi-Tenant</h3>
              <p className="text-blue-100 mb-4">
                Isolation parfaite des données entre organisations avec authentification JWT et audit logs complets
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  <span>Déploiement cloud sécurisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  <span>Chiffrement bout-en-bout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span>Conformité RGPD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choisissez le plan qui correspond à vos besoins
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl transform scale-105'
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="text-sm font-semibold uppercase tracking-wide mb-4 text-blue-100">
                    Plus populaire
                  </div>
                )}
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    plan.highlighted ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span
                    className={`text-lg ${
                      plan.highlighted ? 'text-blue-100' : 'text-gray-600'
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          plan.highlighted ? 'text-white' : 'text-green-600'
                        }`}
                      />
                      <span
                        className={
                          plan.highlighted ? 'text-blue-50' : 'text-gray-600'
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={goToSignup}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Prêt à moderniser votre point de vente ?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Rejoignez des centaines de restaurants qui utilisent déjà FlexPOS
          </p>
          <button
            onClick={goToSignup}
            className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition shadow-xl hover:shadow-2xl text-lg font-semibold inline-flex items-center gap-2"
          >
            Commencer maintenant
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
                <span className="text-xl font-bold text-white">FlexPOS</span>
              </div>
              <p className="text-gray-400">
                Solution POS moderne, sécurisée et conforme NF525
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produit</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="hover:text-white transition">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition">
                    Tarifs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Entreprise</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition">
                    À propos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Carrières
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Légal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    CGU
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FlexPOS. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
