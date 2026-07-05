# Worked example — hardening and cleaning a repository class

## Before

```java
@Repository
public class UserQueryDaoImpl {

    public List<Map<String, Object>> findBySn(String sn, String sortCol) {
        // TODO: cache this lookup once volume grows
        StringBuffer sb = new StringBuffer();
        sb.append("SELECT * FROM APP_USER WHERE SN = '" + sn + "'");   // SQL-1
        sb.append(" ORDER BY " + sortCol);                              // SQL-3
        String sql = sb.toString();
        List<Map<String, Object>> result = null;
        try {
            result = jdbcTemplate.queryForList(sql);
        } catch (Exception e) {
            e.printStackTrace();                                        // LOG-3
        }
        // List<Map<String,Object>> old = legacyQuery(sn);              // OPT-5 dead code
        // return old;
        if (result != null) {
            if (result.size() > 0) {                                    // OPT-3/OPT-4
                return result;
            }
        }
        return Collections.emptyList();
    }
}
```

Findings: SQL-1 (value concatenation), SQL-3 (dynamic column), LOG-1 (no logger),
LOG-3 (`printStackTrace`), OPT-1 (`StringBuffer`), OPT-3/OPT-4 (nested null/size
checks), OPT-5 (commented-out code block). The `// TODO: cache…` comment is
functional and **stays**.

## After

```java
@Slf4j                                   // LOG-1: project already uses Lombok
@Repository
public class UserQueryDaoImpl {

    private static final Set<String> SORTABLE = Set.of("SN", "NAME", "CREATED_AT");

    public List<Map<String, Object>> findBySn(String sn, String sortCol) {
        // TODO: cache this lookup once volume grows
        if (!SORTABLE.contains(sortCol)) {                              // SQL-3: whitelist,
            throw new IllegalArgumentException("Illegal sort column: " + sortCol); // fails loudly
        }
        String sql = "SELECT * FROM APP_USER WHERE SN = ? ORDER BY " + sortCol;
        try {
            List<Map<String, Object>> result =
                jdbcTemplate.queryForList(sql, sn);                     // SQL-1: parameterized
            return result.isEmpty() ? Collections.emptyList() : result; // OPT-3/OPT-4 unified
        } catch (DataAccessException e) {
            log.error("findBySn failed, sn={}", sn, e);                 // LOG-3: context + throwable
            throw e;
        }
    }
}
```

## Why, rule by rule

- **SQL-1:** only the binding changed — the `?` placeholder returns the same rows the
  quoted concatenation did; query logic is untouched.
- **SQL-3:** `sortCol` can't be parameterized, so it is whitelisted; an unknown column
  throws instead of silently defaulting.
- **LOG-3:** the swallowed exception now logs operation + key identifier + throwable
  and rethrows — the failure is no longer invisible. (Preserving the rethrow vs.
  swallow decision follows the original control flow; here the original returned
  through the null path, which the style checkpoint surfaced for confirmation.)
- **OPT-1:** the local `StringBuffer` disappeared entirely with the simpler SQL build.
- **OPT-5:** the commented-out `legacyQuery` block parsed as code — deleted. The TODO
  is prose — preserved.
- **Red lines held:** class name, method signature (`findBySn(String, String)` →
  same), and result semantics unchanged; no existing log lines were edited (there
  were none).
