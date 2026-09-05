package com.moneyhabits.app.data.model

enum class Category(val id: String, val displayName: String, val keywords: List<String>) {
    FOOD(
        id = "food",
        displayName = "Food & Groceries",
        keywords = listOf(
            "bukka", "buka", "amala", "jollof", "chicken republic", "mr biggs",
            "shoprite", "market", "chowdeck", "restaurant", "supermarket", "food",
            "kfc", "dominos", "cold stone", "bukka hut", "kilimanjaro", "mega chicken"
        )
    ),
    TRANSPORT(
        id = "transport",
        displayName = "Transport & Fuel",
        keywords = listOf(
            "uber", "bolt", "indrive", "keke", "danfo", "brt", "fuel", "total",
            "nnpc", "filling station", "toll", "conoil", "ardova", "mobil", "oando"
        )
    ),
    DATA_AIRTIME(
        id = "data_airtime",
        displayName = "Data & Airtime",
        keywords = listOf(
            "mtn", "airtel", "glo", "9mobile", "recharge", "vtu", "airtime",
            "data bundle", "spectranet", "smile", "fiber", "ipnx", "swift"
        )
    ),
    RENT(
        id = "rent",
        displayName = "Rent & Home Care",
        keywords = listOf(
            "rent", "landlord", "estate dues", "service charge", "lawma",
            "facility management", "caretaker", "tenancy", "waste bill"
        )
    ),
    BUSINESS(
        id = "business",
        displayName = "Business & Freelance",
        keywords = listOf(
            "inventory", "supplier", "pos settlement", "invoice", "logistics",
            "freelance", "raw materials", "packaging", "wholesaler", "dispatch"
        )
    ),
    OTHER(
        id = "other",
        displayName = "Other Expenses",
        keywords = listOf(
            "electricity", "nepa", "ekedc", "ikedc", "dstv", "gotv", "startimes",
            "netflix", "gym", "gift", "church", "tithe", "mosque"
        )
    );

    companion object {
        fun fromId(id: String): Category {
            return entries.firstOrNull { it.id.equals(id, ignoreCase = true) } ?: OTHER
        }

        fun matchNarration(narration: String): Category {
            val lower = narration.lowercase()
            for (category in entries) {
                if (category == OTHER) continue
                for (kw in category.keywords) {
                    if (lower.contains(kw)) {
                        return category
                    }
                }
            }
            return OTHER
        }
    }
}
