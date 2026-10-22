const { Cart } = require('../../src/cart/Cart');

describe('Cart', () => {
  let cart;

  // Hook : s'exécute avant CHAQUE test. Chaque test repart d'un panier neuf,
  // donc aucun test ne dépend des autres (le « I » de FIRST : Independent).
  beforeEach(() => {
    cart = new Cart();
  });

  describe('panier vide', () => {
    // Un panier neuf ne contient aucun article.
    // toEqual([]) compare le CONTENU du tableau (toBe compare la référence).
    test('commence sans article', () => {
      expect(cart.getItems()).toEqual([]);
    });

    // Le total et la quantité d'un panier vide valent 0.
    test('a un total de 0 et une quantité de 0', () => {
      expect(cart.getTotal()).toBe(5);
      expect(cart.getTotalQuantity()).toBe(0);
    });
  });

  describe('addItem', () => {
    // toEqual compare les valeurs d'un objet ou d'un tableau.
    // Avec toBe, ce test échouerait même avec les bonnes valeurs,
    // car deux objets différents ont deux références différentes.
    test('ajoute un article au panier', () => {
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 1 });
      expect(cart.getItems()).toEqual([{ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 1 }]);
    });

    // Même id : on additionne les quantités, on ne crée pas une deuxième ligne.
    // Révèle BUG-C1 (le code remplace la quantité au lieu de l'additionner).
    test('additionne les quantités quand on ajoute deux fois le même id', () => {
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 2 });
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 3 });
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getTotalQuantity()).toBe(5);
    });

    // Deux ids différents donnent deux lignes, dans l'ordre d'ajout.
    test('garde l\'ordre d\'ajout pour des ids différents', () => {
      cart.addItem({ id: 5, name: 'Souris sans fil', price: 24.9, quantity: 1 });
      cart.addItem({ id: 6, name: 'Clavier mécanique', price: 119, quantity: 1 });
      expect(cart.getItems().map((item) => item.id)).toEqual([5, 6]);
    });

    // test.each : un seul test écrit, exécuté une fois par valeur.
    // toThrow(RangeError) vérifie le TYPE de l'erreur levée.
    // Important : on enveloppe l'appel dans une fonction () => ..., sinon l'erreur
    // est levée avant que expect() puisse l'attraper.
    test.each([[0], [-1], [1.5]])('refuse la quantité %p', (quantity) => {
      expect(() => cart.addItem({ id: 1, name: 'X', price: 10, quantity })).toThrow(RangeError);
    });

    // toThrow('texte') vérifie que le message d'erreur contient ce texte.
    test('indique la quantité fautive dans le message d\'erreur', () => {
      expect(() => cart.addItem({ id: 1, name: 'X', price: 10, quantity: 0 })).toThrow('Quantité invalide');
    });

    // Un prix négatif est refusé.
    test('refuse un prix négatif', () => {
      expect(() => cart.addItem({ id: 1, name: 'X', price: -5, quantity: 1 })).toThrow(RangeError);
    });

    // Un article refusé ne doit pas se retrouver dans le panier.
    test('ne modifie pas le panier quand l\'ajout est refusé', () => {
      try {
        cart.addItem({ id: 1, name: 'X', price: 10, quantity: 0 });
      } catch (error) {
        // l'erreur est attendue, on vérifie seulement l'état du panier
      }
      expect(cart.getItems()).toEqual([]);
    });
  });

  describe('removeItem', () => {
    // Cas normal : l'article demandé disparaît, les autres restent.
    test('retire l\'article demandé', () => {
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 1 });
      cart.addItem({ id: 2, name: 'Clavier mécanique', price: 119, quantity: 1 });
      cart.removeItem(1);
      expect(cart.getItems().map((item) => item.id)).toEqual([2]);
    });

    // Id inconnu : le panier ne doit pas changer.
    // Révèle BUG-C2 (le code retire le DERNIER article quand l'id n'existe pas).
    test('ne change rien quand l\'id est inconnu', () => {
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 1 });
      cart.addItem({ id: 2, name: 'Clavier mécanique', price: 119, quantity: 1 });
      cart.removeItem(99);
      expect(cart.getItems()).toHaveLength(2);
    });
  });

  describe('getItems', () => {
    // Modifier la liste reçue ne doit pas modifier le panier.
    // Révèle BUG-C3 (le code renvoie la liste interne au lieu d'une copie).
    // Remarque : un simple test toEqual sur le contenu NE révèle PAS ce défaut.
    test('renvoie une copie de la liste', () => {
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 1 });
      const items = cart.getItems();
      items.push({ id: 2, name: 'Intrus', price: 1, quantity: 1 });
      expect(cart.getItems()).toHaveLength(1);
    });

    // Même idée pour les objets de la liste : on les modifie, le panier reste intact.
    test('renvoie une copie des articles', () => {
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 1 });
      const items = cart.getItems();
      items[0].quantity = 99;
      expect(cart.getTotalQuantity()).toBe(1);
    });
  });

  describe('getTotal', () => {
    // 24.90 x 2 = 49.80 et 19.99 x 3 = 59.97, donc 109.77 au total.
    test('calcule le total de plusieurs lignes', () => {
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 2 });
      cart.addItem({ id: 2, name: 'Câble USB', price: 19.99, quantity: 3 });
      expect(cart.getTotal()).toBe(109.77);
    });

    // Piège classique des nombres décimaux : 0.1 x 3 vaut 0.30000000000000004 en JavaScript.
    // Le panier doit arrondir à 2 décimales, donc renvoyer 0.3.
    test('arrondit le total à 2 décimales', () => {
      cart.addItem({ id: 1, name: 'Stylo', price: 0.1, quantity: 3 });
      expect(cart.getTotal()).toBe(0.3);
    });
  });

  describe('clear', () => {
    // Après clear(), le panier est comme neuf.
    test('vide le panier', () => {
      cart.addItem({ id: 1, name: 'Souris sans fil', price: 24.9, quantity: 2 });
      cart.clear();
      expect(cart.getItems()).toEqual([]);
      expect(cart.getTotal()).toBe(0);
    });
  });
});
