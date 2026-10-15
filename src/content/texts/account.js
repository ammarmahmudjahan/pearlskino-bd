export default {
  "account.eyebrow": { default: "{BRAND} - YOUR ACCOUNT", label: "Top: small heading" },

  "account.login.title": { default: "Welcome\n*back.*", label: "Log in: heading", kind: "text" },
  "account.login.text": {
    default: "Log in to follow your orders, save your addresses and keep your favourites.",
    label: "Log in: paragraph",
    kind: "text",
  },
  "account.register.title": { default: "Create your\n*account.*", label: "Create account: heading", kind: "text" },
  "account.register.text": {
    default: "It takes a minute. Your orders, addresses and favourites stay together, wherever you shop from.",
    label: "Create account: paragraph",
    kind: "text",
  },
  "account.forgot.title": { default: "Forgot your\n*password?*", label: "Forgot password: heading", kind: "text" },
  "account.forgot.text": {
    default: "Enter your phone number. If we have your email, we'll send a 6-digit code to it.",
    label: "Forgot password: paragraph",
    kind: "text",
  },

  "account.off": {
    default: "Customer accounts are not available right now. You can still shop and track your order as a guest.",
    label: "Message when accounts are switched off",
    kind: "text",
  },
  "account.off.button": { default: "Track an order", label: "Message when accounts are off: button" },

  "account.tab.login": { default: "Log in", label: "Tab: log in" },
  "account.tab.register": { default: "Create account", label: "Tab: create account" },

  "account.f.name": { default: "Full Name", label: "Field: name" },
  "account.f.phone": { default: "Phone Number", label: "Field: phone" },
  "account.f.email": { default: "Email", label: "Field: email" },
  "account.f.password": { default: "Password", label: "Field: password" },
  "account.f.code": { default: "6-digit code", label: "Field: reset code" },
  "account.f.newPassword": { default: "New Password", label: "Field: new password" },
  "account.f.currentPassword": { default: "Current Password", label: "Field: current password" },
  "account.optional": { default: "OPTIONAL", label: "Tag: optional" },

  "account.ph.name": { default: "Your name", label: "Hint inside the name box", inline: false },
  "account.ph.phone": { default: "01XXXXXXXXX", label: "Hint inside the phone box", inline: false },
  "account.ph.email": { default: "you@example.com", label: "Hint inside the email box", inline: false },
  "account.ph.password": { default: "At least 6 characters", label: "Hint inside the password box", inline: false },

  "account.hint.email": {
    default: "Used only to send you a password reset code and order updates.",
    label: "Create account: email helper",
    kind: "text",
  },
  "account.guest": {
    default: "No account needed to order - you can always check out as a guest.",
    label: "Note: guest checkout is fine",
    kind: "text",
  },

  "account.login.submit": { default: "Log in", label: "Log in: button" },
  "account.login.busy": { default: "Logging in...", label: "Log in: button while working" },
  "account.register.submit": { default: "Create my account", label: "Create account: button" },
  "account.register.busy": { default: "Creating your account...", label: "Create account: button while working" },
  "account.forgot.link": { default: "Forgot your password?", label: "Link: forgot password" },
  "account.forgot.send": { default: "Send me a code", label: "Forgot password: send button" },
  "account.forgot.busy": { default: "Sending...", label: "Forgot password: send button while working" },
  "account.forgot.reset": { default: "Set new password", label: "Forgot password: reset button" },
  "account.forgot.back": { default: "Back to log in", label: "Link: back to log in" },
  "account.forgot.have": { default: "I already have a code", label: "Link: I already have a code" },

  "account.hi": { default: "Hello, {name}", label: "Dashboard: greeting", hint: "{name} fills in the customer's first name" },
  "account.hi.text": {
    default: "Everything about your {brand} orders, in one place.",
    label: "Dashboard: line under the greeting",
    kind: "text",
  },
  "account.logout": { default: "Log out", label: "Dashboard: log out button" },

  "account.nav.orders": { default: "My orders", label: "Dashboard tab: orders" },
  "account.nav.wishlist": { default: "Favourites", label: "Dashboard tab: wishlist" },
  "account.nav.addresses": { default: "Addresses", label: "Dashboard tab: addresses" },
  "account.nav.profile": { default: "Profile", label: "Dashboard tab: profile" },

  "account.orders.title": { default: "Your orders", label: "Orders: heading" },
  "account.orders.loading": { default: "Loading your orders...", label: "Orders: loading text" },
  "account.orders.empty": {
    default: "You haven't placed an order yet. Your next one will show up here.",
    label: "Orders: nothing yet",
    kind: "text",
  },
  "account.orders.shop": { default: "Start shopping", label: "Orders: nothing yet - button" },
  "account.orders.placed": { default: "Placed", label: "Orders: placed date label" },
  "account.orders.total": { default: "Total", label: "Orders: total label" },
  "account.orders.track": { default: "Track order", label: "Orders: track button" },
  "account.orders.more": { default: "+{count} more", label: "Orders: more items", hint: "{count} fills in the number" },

  "account.claim.title": { default: "Ordered before without an account?", label: "Add an order: heading" },
  "account.claim.text": {
    default: "Add that order to your account with its order number and the phone number you used.",
    label: "Add an order: paragraph",
    kind: "text",
  },
  "account.claim.order": { default: "Order Number", label: "Add an order: order number label" },
  "account.claim.phone": { default: "Phone used for the order", label: "Add an order: phone label" },
  "account.claim.submit": { default: "Add this order", label: "Add an order: button" },
  "account.claim.ok": { default: "Done - that order is now in your account.", label: "Add an order: success message" },

  "account.wishlist.title": { default: "Your favourites", label: "Favourites: heading" },
  "account.wishlist.empty": {
    default: "Tap the heart on any product to keep it here.",
    label: "Favourites: nothing yet",
    kind: "text",
  },
  "account.wishlist.shop": { default: "Browse the shop", label: "Favourites: nothing yet - button" },

  "account.addresses.title": { default: "Saved addresses", label: "Addresses: heading" },
  "account.addresses.text": {
    default: "Pick one at checkout and your details fill in by themselves.",
    label: "Addresses: paragraph",
    kind: "text",
  },
  "account.addresses.empty": { default: "No saved addresses yet.", label: "Addresses: nothing yet" },
  "account.addresses.add": { default: "Add an address", label: "Addresses: add button" },
  "account.addresses.limit": { default: "You can save up to 5 addresses.", label: "Addresses: limit note" },
  "account.addresses.label": { default: "Label (Home, Office...)", label: "Addresses: label field" },
  "account.addresses.name": { default: "Name for delivery", label: "Addresses: name field" },
  "account.addresses.phone": { default: "Phone", label: "Addresses: phone field" },
  "account.addresses.address": { default: "Full address", label: "Addresses: address field" },
  "account.addresses.area": { default: "Area", label: "Addresses: area field" },
  "account.addresses.save": { default: "Save addresses", label: "Addresses: save button" },
  "account.addresses.remove": { default: "Remove", label: "Addresses: remove button" },

  "account.profile.title": { default: "Your details", label: "Profile: heading" },
  "account.profile.save": { default: "Save changes", label: "Profile: save button" },
  "account.profile.phoneNote": {
    default: "Your phone number is your login. To change it, please contact us.",
    label: "Profile: phone note",
    kind: "text",
  },
  "account.password.title": { default: "Change password", label: "Password: heading" },
  "account.password.save": { default: "Update password", label: "Password: button" },
  "account.saved": { default: "Saved.", label: "Message: saved" },
  "account.passwordSaved": { default: "Your password was updated.", label: "Message: password updated" },
};
