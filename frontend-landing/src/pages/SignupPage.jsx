import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';

function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    organizationName: '',
    contactEmail: '',
    contactName: '',
    phone: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('https://api.flexpos.app/api/auth/signup', formData);

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error?.message || 'Une erreur est survenue');
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        'Impossible de créer votre compte. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Compte créé avec succès! 🎉
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Vos identifiants de connexion ont été envoyés par email à{' '}
              <strong>{formData.contactEmail}</strong>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-3">Prochaines étapes:</h3>
              <ol className="text-left text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Vérifiez votre boîte email (et les spams)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Récupérez votre username et code PIN à 4 chiffres</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Connectez-vous sur app.flexpos.app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>Configurez vos produits et commencez à vendre!</span>
                </li>
              </ol>
            </div>
            <button
              onClick={() => window.location.href = 'https://app.flexpos.app/login'}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl font-semibold"
            >
              Se connecter maintenant
            </button>
            <button
              onClick={() => navigate('/')}
              className="ml-4 px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition"
            >
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FlexPOS
              </span>
            </button>
            <button
              onClick={() => window.location.href = 'https://app.flexpos.app/login'}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              Déjà un compte? <span className="font-semibold text-blue-600">Se connecter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Créer votre compte FlexPOS
            </h1>
            <p className="text-gray-600">
              Commencez à utiliser FlexPOS gratuitement en quelques minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name */}
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">
                Nom de votre établissement *
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                value={formData.organizationName}
                onChange={handleChange}
                placeholder="Restaurant Le Gourmet"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* Contact Name */}
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                Votre nom complet *
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                required
                value={formData.contactName}
                onChange={handleChange}
                placeholder="Jean Dupont"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email professionnel *
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="contact@restaurant.fr"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <p className="text-sm text-gray-500 mt-1">
                Vos identifiants de connexion seront envoyés à cette adresse
              </p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone (optionnel)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'Créer mon compte gratuitement'
              )}
            </button>

            <p className="text-sm text-gray-500 text-center">
              En créant un compte, vous acceptez nos{' '}
              <a href="#" className="text-blue-600 hover:underline">
                conditions d'utilisation
              </a>{' '}
              et notre{' '}
              <a href="#" className="text-blue-600 hover:underline">
                politique de confidentialité
              </a>
            </p>
          </form>
        </div>

        {/* Benefits */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Gratuit pendant 30 jours</h3>
            <p className="text-sm text-gray-600">Testez toutes les fonctionnalités sans carte bancaire</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Configuration instantanée</h3>
            <p className="text-sm text-gray-600">Recevez vos identifiants par email en quelques secondes</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Support inclus</h3>
            <p className="text-sm text-gray-600">Notre équipe vous accompagne dans la prise en main</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
